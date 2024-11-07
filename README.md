# OpenAI Client

Este é um cliente simples para interagir com a API do ChatGPT, utilizando a OpenAI API. O código permite que você envie perguntas para o ChatGPT, armazene o histórico de mensagens e calcule o custo da utilização da API com base nos tokens consumidos. O histórico é salvo em um banco de dados SQLite e os custos de utilização são registrados em um arquivo CSV.

## Funcionalidades

- Envio de perguntas para a API do ChatGPT.
- Armazenamento do histórico de interações em um banco de dados SQLite.
- Cálculo e registro do custo com base nos tokens usados.
- Consulta ao histórico de interações por período de tempo.
- Geração de um arquivo CSV com os custos de uso.

## Pré-requisitos

- [Node.js](https://nodejs.org) versão 14 ou superior.
- [OpenAI API Key](https://beta.openai.com/account/api-keys) (necessária para autenticação na API do ChatGPT).

## Instalação

1. Clone este repositório:

   ```bash
   git clone https://github.com/seu-usuario/openai-chat-client.git
   cd openai-chat-client
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Crie um arquivo .env na raiz do projeto com suas credenciais da API OpenAI:

   ```bash
   OPENAI_API_KEY=your-api-key-here
   OPEN_AI_API_ROUTE=https://api.openai.com/v1/chat/completions
   MODEL_SELECTED=gpt-3.5-turbo
   ```

4. Crie o arquivo CSV model_rates.csv contendo as taxas de consumo de tokens para os modelos. O formato esperado é:

   ```bash
   model,rate-1k-tkns
   gpt-3.5-turbo,0.002
   ```

## Uso

1. Execute o script:

   ```bash
   npm start
   ```

2. O prompt de linha de comando irá aparecer, onde você pode interagir com o ChatGPT. Digite sua pergunta ou comando.

- Para encerrar o programa, digite sair.
- Para consultar o histórico, use o comando history DD/MM/YYYY - DD/MM/YYYY.

Exemplo de consulta ao histórico:

    ```bash
    history 01/01/2024 - 31/01/2024
    ```

3. O histórico de interações é salvo em um banco de dados SQLite (chat_history.db), e os custos de uso são registrados em um arquivo CSV (usage_costs.csv).

## Estrutura de Arquivos

- client.js: Arquivo principal contendo a lógica de interação com a API, armazenamento no banco de dados e cálculos de custo.
- chat_history.db: Banco de dados SQLite que armazena o histórico de interações.
- usage_costs.csv: Arquivo CSV que registra os custos de uso da API.
- model_rates.csv: Arquivo CSV que contém as taxas de custo por modelo (por 1.000 tokens).
- .env: Arquivo de configuração contendo suas credenciais da OpenAI.

## Licença

Este projeto está licenciado sob a MIT License.
