import { type ReactNode, useState } from "react";
import { useSession } from "../../lib/session";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export interface AppShellProps {
	children: ReactNode;
}

/**
 * Casca das telas autenticadas: topbar + sidebar + área de conteúdo.
 *
 * Todas as rotas do MVP usam esta casca — por isso o layout é um componente
 * só, e não código repetido em cada tela.
 */
export function AppShell({ children }: AppShellProps) {
	const session = useSession();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<div className="h-dvh w-screen overflow-hidden bg-canvas">
			<Topbar
				session={session}
				onMenuToggle={() => setMobileMenuOpen((open) => !open)}
			/>
			<div className="flex h-[calc(100dvh-3.5rem)] min-h-0">
				<Sidebar
					session={session}
					mobileOpen={mobileMenuOpen}
					onMobileClose={() => setMobileMenuOpen(false)}
				/>
				<main className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:px-7 sm:py-4">
					{children}
				</main>
			</div>
		</div>
	);
}
