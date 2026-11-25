import type { ReactNode } from "react";

export interface PublicShellProps {
	/** Coluna da esquerda: herói da marca. */
	hero: ReactNode;
	/** Coluna da direita: card de acesso. */
	children: ReactNode;
}

/**
 * Casca das telas públicas.
 *
 * Fonte: board `Tela 01-L` da página `04. Ligth` do Penpot — herói da marca à
 * esquerda (720px) e card de acesso à direita. Telas de autenticação
 * reaproveitam a mesma casca em vez de repetir a grade.
 */
export function PublicShell({ hero, children }: PublicShellProps) {
	return (
		<div className="grid min-h-screen bg-canvas xl:grid-cols-[720px_minmax(0,1fr)]">
			<section className="relative hidden min-h-screen overflow-hidden border-r border-line bg-surface xl:block">
				<div
					aria-hidden
					className="pointer-events-none absolute -left-[60px] -top-[60px] size-[320px] rounded-full bg-[#fee2e2] dark:bg-brand-500/15"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute bottom-[-20px] right-[-40px] size-[280px] rounded-full bg-[#e0f2fe] dark:bg-sky-500/10"
				/>
				<div className="relative z-10 h-full px-[72px] pb-[44px] pt-[68px]">
					{hero}
				</div>
			</section>
			<section className="flex min-h-screen items-start justify-center bg-canvas px-4 py-6 sm:items-center sm:p-6">
				<div className="xl:-translate-x-[10px]">{children}</div>
			</section>
		</div>
	);
}
