# Estágio 1: Base e Dependências
# Usamos uma imagem Node.js LTS (Long Term Support) baseada em Alpine (leve)
FROM node:20-alpine AS dependencies

# Define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia os arquivos de definição de pacotes e instala TODAS as dependências
# (incluindo as de desenvolvimento, que são necessárias para o build)
COPY package*.json ./
RUN npm install

# Estágio 2: Build da Aplicação
# Começa a partir do estágio anterior onde as dependências já estão instaladas
FROM dependencies AS build

# Copia todo o resto do código fonte do projeto
COPY . .

# Comando crucial: Gera o Prisma Client. Isso é necessário porque o ambiente de build
# é limpo e não terá o client gerado localmente.
RUN npx prisma generate

# Compila o TypeScript para JavaScript
RUN npm run build

# Estágio 3: Produção
# Começa novamente com a imagem Node.js base limpa para manter a imagem final pequena
FROM node:20-alpine AS production

# Define a variável de ambiente para que o NestJS rode em modo de produção
ENV NODE_ENV production

WORKDIR /usr/src/app

# Copia os arquivos de pacotes novamente
COPY package*.json ./

# Instala SOMENTE as dependências de produção, otimizando o tamanho
RUN npm ci --omit=dev

# Copia os artefatos do estágio de build para a imagem final
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /usr/src/app/prisma ./prisma

# Expõe a porta que a aplicação vai usar. O Render usa a variável de ambiente PORT.
# O NestJS no nosso main.ts já está configurado para ouvir em process.env.PORT || 3000
EXPOSE 3000

# Comando para iniciar a aplicação em produção
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
