import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { type RenderResult, render } from "@testing-library/react";
import { queryClient } from "#/lib/query-client";
import { createAppRouter } from "../router";

/**
 * Renderiza a rota real do app em memória (sem navegador e sem servidor).
 *
 * Usa a mesma árvore de rotas e o mesmo `queryClient` de produção: o guard de
 * sessão (`beforeLoad`) e o componente que chama `useSession()` precisam olhar
 * o mesmo cache — com clientes diferentes, o guard carregaria a sessão num
 * cache e a tela leria outro.
 */
export function renderRoute(pathname: string): RenderResult {
	const router = createAppRouter(
		createMemoryHistory({ initialEntries: [pathname] }),
	);

	return render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
}
