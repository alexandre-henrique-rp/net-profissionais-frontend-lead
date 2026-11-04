#!/usr/bin/env bash
# deploy.sh — atualiza o frontend NetProfissional a partir do GitHub.
#
# Fluxo de "Atualizar":
#   1. git pull (recebe o código mais recente do repositório)
#   2. docker build da imagem de build (instala libs + vite build)
#   3. roda o container de build, que copia o dist/ para o volume
#   4. sobe/recarrega o nginx que serve esse volume em :8080
#   5. limpeza das imagens Docker não utilizadas
#
# Uso:
#   ./deploy.sh            → abre o menu interativo (Atualizar / Sair)
#   ./deploy.sh atualizar  → executa tudo direto, sem menu
#
# Variáveis opcionais:
#   VITE_API_URL  → URL da API gravada no bundle (ex.: https://api.dominio/api/v1)
#   PORTA_WEB     → porta exposta pelo nginx (padrão: 8080)

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PORTA_WEB="${PORTA_WEB:-8080}"
export WEB_PORT="$PORTA_WEB"

# docker compose (plugin v2) ou docker-compose (binário v1)
if docker compose version >/dev/null 2>&1; then
	DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
	DC=(docker-compose)
else
	echo "ERRO: docker compose não encontrado." >&2
	exit 1
fi

atualizar() {
	echo
	echo "== 1/5 · git pull =="
	git pull --ff-only

	echo
	echo "== 2/5 · build da imagem (instala libs + vite build) =="
	"${DC[@]}" build frontend-build

	echo
	echo "== 3/5 · entrega do dist/ no volume compartilhado =="
	"${DC[@]}" run --rm frontend-build

	echo
	echo "== 4/5 · nginx servindo o build em http://localhost:${PORTA_WEB} =="
	WEB_PORT="$PORTA_WEB" "${DC[@]}" up -d frontend-web

	echo
	echo "== 5/5 · limpeza das imagens não utilizadas =="
	docker image prune -f

	echo
	echo "✔ Atualização concluída — build servido em http://localhost:${PORTA_WEB}"
}

menu() {
	while true; do
		echo
		echo "┌──────────────────────────────────────────────────┐"
		echo "│   NetProfissional — Deploy do Frontend           │"
		echo "└──────────────────────────────────────────────────┘"
		echo "  1) Atualizar (git pull → build → volume → limpeza)"
		echo "  2) Sair"
		echo
		read -rp "Escolha uma opção [1-2]: " opcao

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
