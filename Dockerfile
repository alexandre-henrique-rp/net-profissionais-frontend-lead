# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Estágio 1 — build: instala as bibliotecas e gera o dist/ do SPA (vite build)
# -----------------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Só os manifests primeiro: o yarn install fica em cache enquanto o lockfile
# não muda, mesmo que o código-fonte seja alterado.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

# A URL da API é gravada no bundle em tempo de build
# (src/lib/api.ts lê import.meta.env.VITE_API_URL).
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

RUN yarn build

# -----------------------------------------------------------------------------
# Estágio 2 — runtime: serve o dist/ diretamente na porta 3001 (sem proxy)
# -----------------------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app

COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node deploy/serve.mjs ./deploy/serve.mjs

ENV PORT=3001
EXPOSE 3001
USER node
CMD ["node", "deploy/serve.mjs"]
