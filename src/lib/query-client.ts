import { QueryClient } from "@tanstack/react-query";

/**
 * Cliente de dados do app.
 *
 * Vive num módulo próprio (e não no `router.tsx`) porque a sessão precisa dele
 * nos guards (`beforeLoad`), e importar o router de dentro da sessão criaria um
 * ciclo: router → rotas → sessão → router.
 */
export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { staleTime: 30_000, retry: 1 },
		},
	});
}

/** Instância usada pelo app e pelos guards. */
export const queryClient = createQueryClient();
