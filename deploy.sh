#!/usr/bin/env bash
# deploy.sh — gera o build do frontend numa pasta local e encerra.
#
# Fluxo de "Atualizar":
#   1. git pull (recebe o código mais recente)
#   2. docker build da imagem de build (instala libs + vite build)
#   3. roda o container uma vez: ele copia o dist/ para ./build e termina
#   4. limpeza das imagens Docker não utilizadas
#
# Uso:
#   ./deploy.sh            → abre o menu interativo (Atualizar / Sair)
#   ./deploy.sh atualizar  → executa tudo direto, sem menu
#
# Variáveis opcionais:
#   VITE_API_URL → URL da API gravada no bundle (padrão: http://localhost:3000/api/v1)
#   IMAGEM       → nome da imagem de build (padrão: net-profissionais-frontend-build)

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

IMAGEM="${IMAGEM:-net-profissionais-frontend-build}"
BUILD_DIR="$DIR/build"
VITE_API_URL="${VITE_API_URL:-http://localhost:3000/api/v1}"

atualizar() {
	echo
	echo "== 1/4 · git pull =="
	git pull --ff-only

	echo
	echo "== 2/4 · build da imagem (instala libs + vite build) =="
	docker build --build-arg "VITE_API_URL=${VITE_API_URL}" -t "$IMAGEM" .

	echo
	echo "== 3/4 · gerando ./build (o container copia o dist/ e encerra) =="
	mkdir -p "$BUILD_DIR"
	docker run --rm --user "$(id -u):$(id -g)" -v "$BUILD_DIR:/output" "$IMAGEM"

	echo
	echo "== 4/4 · limpeza das imagens não utilizadas =="
	docker image prune -f

	echo
	echo "✔ Build disponível em $BUILD_DIR"
}

menu() {
	while true; do
		echo
		echo "┌──────────────────────────────────────────────────┐"
		echo "│   NetProfissional — Build do Frontend            │"
		echo "└──────────────────────────────────────────────────┘"
		echo "  1) Atualizar (git pull → build → ./build → limpeza)"
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
