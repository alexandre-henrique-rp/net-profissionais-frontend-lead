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
ARG VITE_API_URL=http://localhost:3000/api/v1
ENV VITE_API_URL=${VITE_API_URL}

RUN yarn build

# -----------------------------------------------------------------------------
# Estágio 2 — entrega: imagem mínima que copia o build para o volume /output
# -----------------------------------------------------------------------------
FROM alpine:3.20
WORKDIR /build
COPY --from=build /app/dist ./dist

# Monte aqui um volume nomeado ou uma pasta do host — o build é copiado na
# subida do container, então funciona com os dois tipos de mount.
VOLUME ["/output"]
CMD ["sh", "-c", "rm -rf /output/* && cp -r /build/dist/. /output/ && echo 'Build entregue em /output'"]
