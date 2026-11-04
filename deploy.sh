#!/usr/bin/env bash
# deploy.sh — builda o frontend e sobe um container servindo o SPA.
#
# Fluxo de "Atualizar":
#   1. git pull (recebe o código mais recente)
#   2. docker build da imagem (instala libs + vite build + runtime node)
#   3. recria o container "netprofissional-frontend" servindo na porta definida por PORTA (padrão 3001)
#   4. limpeza das imagens Docker não utilizadas
#
# Uso:
#   ./deploy.sh            → abre o menu interativo (Atualizar / Sair)
#   ./deploy.sh atualizar  → executa tudo direto, sem menu
#
# Variáveis opcionais:
#   VITE_API_URL → URL da API gravada no bundle (padrão: http://localhost:3000/api/v1)
#   PORTA        → porta do host onde o SPA responde (padrão: 3001)
#   IMAGEM       → nome da imagem (padrão: net-profissionais-frontend-build)
#   CONTAINER    → nome do container (padrão: netprofissional-frontend)

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

IMAGEM="${IMAGEM:-net-profissionais-frontend-build}"
CONTAINER="${CONTAINER:-netprofissional-frontend}"
PORTA="${PORTA:-3001}"
VITE_API_URL="${VITE_API_URL:-http://localhost:3000/api/v1}"

atualizar() {
	echo
	echo "== 1/4 · git pull =="
	git pull --ff-only

	echo
	echo "== 2/4 · build da imagem (instala libs + vite build) =="
	docker build --build-arg "VITE_API_URL=${VITE_API_URL}" -t "$IMAGEM" .

	echo
	echo "== 3/4 · recriando o container $CONTAINER na porta $PORTA =="
	docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
	docker run -d --name "$CONTAINER" --restart unless-stopped \
		-p "${PORTA}:3001" "$IMAGEM"

	echo
	echo "== 4/4 · limpeza das imagens não utilizadas =="
	docker image prune -f

	echo
	if command -v curl >/dev/null 2>&1 && \
		curl --fail --silent --max-time 5 "http://127.0.0.1:${PORTA}/" >/dev/null; then
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
