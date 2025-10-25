FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm ci

# Copiar código fonte e fazer build
COPY . .
RUN npm run build

# Imagem de produção
FROM node:18-alpine AS runner

WORKDIR /app

# Copiar arquivos necessários do builder
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expor porta
EXPOSE 3000

# Comando para iniciar
CMD ["node", "server.js"]