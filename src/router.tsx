import type { RouterHistory } from "@tanstack/react-router";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// O cliente de dados vive em `lib/query-client.ts` (a sessão o usa nos guards);
// reexportado aqui para os testes continuarem importando de `#/router`.
export { createQueryClient, queryClient } from "./lib/query-client";

/**
 * Cria o router com as opções do app.
 *
 * Aceita `history` para os testes rodarem em memória, sem navegador real.
 */
export function createAppRouter(history?: RouterHistory) {
	return createTanStackRouter({
		routeTree,
		history,
		scrollRestoration: true,
		// Pré-carrega a rota de destino quando o ponteiro passa pelo link.
		defaultPreload: "intent",
		defaultPreloadStaleTime: 30_000,
	});
}

export function getRouter() {
	return createAppRouter();
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createAppRouter>;
	}
}
