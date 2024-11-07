const dotenv = require('dotenv').config();
const axios = require('axios');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvParser = require('csv-parser');

const db = new sqlite3.Database('./chat_history.db');

db.run(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS usage_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    tokens_used INTEGER,
    model TEXT,
    cost REAL
  )
`);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const csvWriter = createCsvWriter({
    path: 'usage_costs.csv',
    header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'tokens_used', title: 'Tokens Used' },
        { id: 'model', title: 'Model' },
        { id: 'cost', title: 'Cost (USD)' },
        { id: 'total_cost', title: 'Total Cost (USD)' }
    ],
    append: fs.existsSync('usage_costs.csv')
});

function loadModelRates(callback) {
    const rates = {};
    fs.createReadStream('model_rates.csv')
        .pipe(csvParser())
        .on('data', (row) => {
            rates[row.model] = parseFloat(row['rate-1k-tkns']);
        })
        .on('end', () => {
            callback(rates);
        });
}

function saveMessage(role, content) {
    const stmt = db.prepare('INSERT INTO history (role, content) VALUES (?, ?)');
    stmt.run(role, content);
    stmt.finalize();
}

function getLastFiveInteractions(callback) {
    const query = `SELECT role, content FROM history ORDER BY timestamp DESC LIMIT 5`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar histórico:", err.message);
            callback([]);
        } else {
            callback(rows.reverse());
        }
    });
}

function calculateCost(tokens, model, modelRates) {
    const rate = modelRates[model] || 0.002;
    const cost = (tokens / 1000) * rate;
    return cost;
}

async function getChatGPTResponse(prompt, modelRates) {
    saveMessage('user', prompt);

    getLastFiveInteractions(async (recentHistory) => {
        const messages = recentHistory.map(row => ({ role: row.role, content: row.content }));
        messages.push({ role: 'user', content: prompt });

        try {
            const response = await axios.post(
                process.env.OPEN_AI_API_ROUTE,
                {
                    model: process.env.MODEL_SELECTED,
                    messages: messages,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                }
            );

            const tokensUsed = response.data.usage.total_tokens;
            const model = response.data.model;
            const cost = calculateCost(tokensUsed, model, modelRates);

            const stmt = db.prepare('INSERT INTO usage_costs (tokens_used, model, cost) VALUES (?, ?, ?)');
            stmt.run(tokensUsed, model, cost);
            stmt.finalize();

            const timestamp = new Date().toISOString();
            const totalCost = await getTotalCost();

            const record = {
                timestamp,
                tokens_used: tokensUsed,
                model: model,
                cost: cost.toFixed(4),
                total_cost: (totalCost + cost).toFixed(4)
            };

            csvWriter.writeRecords([record]).then(() => {
                console.log('\nResposta do ChatGPT:\n');
                console.log(`\x1b[0m${response.data.choices[0].message.content}\n`);
                console.log(`\x1b[90mTokens Usados: ${tokensUsed}, Custo: $${cost.toFixed(4)}`);
                askQuestion(modelRates);
            });

        } catch (error) {
            console.error('Erro ao chamar a API:', error.response ? error.response.data : error.message);
            askQuestion(modelRates);
        }
    });
}

async function getTotalCost() {
    const query = `SELECT SUM(cost) AS total_cost FROM usage_costs`;
    return new Promise((resolve, reject) => {
        db.get(query, [], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row.total_cost || 0);
            }
        });
    });
}

function getHistoryByPeriod(startDate, endDate, callback) {
    const query = `
        SELECT role, content, timestamp
        FROM history
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp ASC
    `;
    db.all(query, [startDate, endDate], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar histórico por período:", err.message);
            callback([]);
        } else {
            callback(rows);
        }
    });
}

function askQuestion(modelRates) {
    rl.question('\x1b[32mDigite sua pergunta para o ChatGPT ou um comando (ou "sair" para encerrar): \x1b[0m', (input) => {
        input = input.trim();

        if (input.toLowerCase() === 'sair') {
            rl.close();
            db.close();
            console.log("Programa encerrado.");
        } else if (input.toLowerCase().startsWith('history')) {
            const regex = /history (\d{2}\/\d{2}\/\d{4}) - (\d{2}\/\d{2}\/\d{4})/;
            const match = input.match(regex);

            if (match) {
                const startDate = match[1].split('/').reverse().join('-');
                const endDate = match[2].split('/').reverse().join('-');

                getHistoryByPeriod(startDate, endDate, (history) => {
                    if (history.length > 0) {
                        console.log(`\nHistórico de ${startDate} até ${endDate}:`);
                        history.forEach((row) => {
                            console.log(`[${row.timestamp}] (${row.role}): ${row.content}`);
                        });
                    } else {
                        console.log('Nenhum histórico encontrado para esse período.');
                    }
                    askQuestion(modelRates);
                });
            } else {
                console.log('Formato de comando "history" inválido. Use o formato: history DD/MM/YYYY - DD/MM/YYYY');
                askQuestion(modelRates);
            }
        } else if (input) {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            getChatGPTResponse(input, modelRates);
        } else {
            askQuestion(modelRates);
        }
    });
}

loadModelRates((modelRates) => {
    askQuestion(modelRates);
});
