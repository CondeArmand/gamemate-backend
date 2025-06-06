GameMate - Backend
Este é o repositório do serviço de backend para o projeto GameMate, uma plataforma para conectar jogadores. Desenvolvido com o framework NestJS, este serviço é responsável por gerenciar usuários, autenticação e fornecer dados de jogos através da API da IGDB, com um sistema de cache robusto utilizando Redis.

Tecnologias Utilizadas
Framework Principal: NestJS (TypeScript)
Banco de Dados: PostgreSQL
ORM: Prisma
Cache: Redis
Containerização: Docker e Docker Compose
Autenticação (Verificação): Firebase Admin SDK
API de Jogos: IGDB
Pré-requisitos
Antes de começar, garanta que você tenha as seguintes ferramentas instaladas na sua máquina:

Git
Node.js (v20.x ou superior)
npm ou yarn
Docker
Docker Compose (geralmente já vem com o Docker Desktop)
Configuração do Ambiente Local
Siga os passos abaixo para configurar e rodar o projeto na sua máquina.

1. Clonar o Repositório

Bash

git clone <URL_DO_SEU_REPOSITORIO>
cd gamemate-backend
2. Configurar Variáveis de Ambiente

Este projeto utiliza um arquivo .env para gerenciar as variáveis de ambiente.

Crie um arquivo chamado .env na raiz do projeto.
Copie o conteúdo do exemplo abaixo para o seu novo arquivo .env e preencha com suas próprias credenciais.
.env.example

Snippet de código

# PostgreSQL
POSTGRES_USER=gamemate
POSTGRES_PASSWORD=gamematepass
POSTGRES_DB=gamemate
POSTGRES_PORT=5432
DATABASE_URL="postgresql://gamemate:gamematepass@localhost:5432/gamemate?schema=public"

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# IGDB / Twitch API
IGDB_CLIENT_ID=SEU_CLIENT_ID_DA_TWITCH_AQUI
IGDB_CLIENT_SECRET=SEU_CLIENT_SECRET_DA_TWITCH_AQUI

# Porta da Aplicação NestJS
PORT=3000
3. Configurar Credenciais do Firebase

Obtenha o seu arquivo de credenciais serviceAccountKey.json do console do Firebase.
Renomeie-o para firebase-service-account.json.
Coloque este arquivo na raiz do projeto.
Importante: Este arquivo é sensível e já deve estar no seu .gitignore para não ser enviado ao repositório.
4. Iniciar a Infraestrutura com Docker

O PostgreSQL e o Redis são gerenciados pelo Docker Compose. Para iniciá-los, execute:

Bash

docker-compose up -d
O comando -d executa os containers em modo "detached" (em segundo plano).
Para verificar se os containers estão rodando, use docker-compose ps.
5. Instalar as Dependências do Projeto

Bash

npm install
# ou
yarn install
6. Executar as Migrações do Banco de Dados

Com a infraestrutura Docker rodando, precisamos criar as tabelas no banco de dados. O Prisma gerencia isso para nós.

Bash

npx prisma migrate dev
Este comando irá ler o seu schema.prisma e aplicar as migrações necessárias no banco de dados PostgreSQL.
Rodando a Aplicação
Após a configuração, você pode iniciar o servidor NestJS.

Modo de Desenvolvimento

Este modo observa alterações nos arquivos e recarrega o servidor automaticamente.

Bash

npm run start:dev
A aplicação estará disponível em http://localhost:3000 (ou na porta definida no seu .env).

Modo de Produção

Para rodar em modo de produção, primeiro compile o projeto e depois inicie o servidor:

Bash

# 1. Compilar o projeto
npm run build

# 2. Iniciar em modo de produção
npm run start:prod
