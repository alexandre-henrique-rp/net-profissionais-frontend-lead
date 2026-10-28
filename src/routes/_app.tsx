import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "#/components/layout/AppShell";
import { getSession } from "#/lib/session";

export const Route = createFileRoute("/_app")({
	beforeLoad: async () => {
		// Guarda de sessão: pergunta ao backend quem é o dono do cookie
		// (`GET /auth/me`). Sem sessão, a rota protegida manda para o login.
		if (!(await getSession())) {
			throw redirect({ to: "/login" });
		}
	},
	component: AppLayout,
});

function AppLayout() {
	return (
		<AppShell>
			<Outlet />
		</AppShell>
	);
}
