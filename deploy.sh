#!/usr/bin/env bash
# deploy.sh — builda o frontend e sobe um container servindo o SPA.
#
# Fluxo de "Atualizar":
#   1. git pull (recebe o código mais recente)
#   2. docker compose build da imagem (instala libs + vite build + runtime node)
#   3. docker compose up -d recria o container servindo na porta PORTA (padrão 3001)
#   4. limpeza das imagens Docker não utilizadas
#
# Uso:
#   ./deploy.sh            → abre o menu interativo (Atualizar / Sair)
#   ./deploy.sh atualizar  → executa tudo direto, sem menu
#
# Variáveis opcionais:
#   VITE_API_URL → base da API no bundle (padrão: /api/v1, mesmo domínio)
#   PORTA        → porta do host onde o SPA responde (padrão: 3001)
#   CONTAINER    → nome do container (padrão: netprofissional-frontend)

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PROJECT="net-profissionais-frontend-lead"
CONTAINER="${CONTAINER:-netprofissional-frontend}"
PORTA="${PORTA:-3001}"
VITE_API_URL="${VITE_API_URL:-/api/v1}"

if docker compose version >/dev/null 2>&1; then
	COMPOSE=(docker compose --project-name "$PROJECT" --file "$DIR/docker-compose.yml")
elif command -v docker-compose >/dev/null 2>&1; then
	COMPOSE=(docker-compose --project-name "$PROJECT" --file "$DIR/docker-compose.yml")
else
	echo "ERRO: docker compose não foi encontrado." >&2
	exit 1
fi

compose() {
	PORTA="$PORTA" VITE_API_URL="$VITE_API_URL" "${COMPOSE[@]}" "$@"
}

atualizar() {
	echo
	echo "== 1/4 · git pull =="
	git pull --ff-only

	echo
	echo "== 2/4 · build da imagem (instala libs + vite build) =="
	compose build frontend

	echo
	echo "== 3/4 · recriando o container $CONTAINER na porta $PORTA =="
	docker network inspect net-profissionais-backend-lead_api >/dev/null 2>&1 || \
		docker network create net-profissionais-backend-lead_api >/dev/null
	compose up -d --force-recreate frontend

	echo
	echo "== 4/4 · limpeza das imagens não utilizadas =="
	docker image prune -f

	echo
	nao=0
	while ((nao < 10)); do
		if command -v curl >/dev/null 2>&1 && \
			curl --fail --silent --max-time 2 "http://127.0.0.1:${PORTA}/" >/dev/null; then
			break
		fi
		sleep 1
		nao=$((nao + 1))
	done
	if ((nao < 10)); then
		echo "✔ Frontend no ar em http://localhost:${PORTA}"
	else
		echo "Container $CONTAINER iniciado; verifique com: docker logs $CONTAINER"
	fi
}

menu() {
	while true; do
		echo
		echo "┌──────────────────────────────────────────────────┐"
		echo "│   NetProfissional — Build do Frontend            │"
		echo "└──────────────────────────────────────────────────┘"
		echo "  1) Atualizar (git pull → build → container :3001 → limpeza)"
		echo "  2) Sair"
		echo
		read -r -p "Escolha uma opção [1-2]: " opcao

		case "$opcao" in
			1 | atualizar)
				atualizar
				;;
			2 | sair | q | quit | exit)
				echo "Saindo."
				exit 0
				;;
			*)
				echo "Opção inválida — escolha 1 ou 2."
				;;
		esac
	done
}

case "${1:-menu}" in
	atualizar | update)
		atualizar
		;;
	sair | exit | quit)
		echo "Saindo."
		exit 0
		;;
	menu | "")
		menu
		;;
	*)
		echo "Uso: $0 [atualizar|sair]" >&2
		exit 2
		;;
esac
