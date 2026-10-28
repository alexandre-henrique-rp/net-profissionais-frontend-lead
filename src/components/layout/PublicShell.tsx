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
		<div className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(460px,1fr)_1fr] xl:grid-cols-[720px_1fr]">
			<section className="relative hidden flex-col justify-between overflow-hidden bg-[#0c1322] p-8 xl:p-14 lg:flex border-r border-slate-800">
				{/* Efeitos de iluminação de fundo do Penpot Tela 01-L */}
				<div
					aria-hidden
					className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-brand-500/15 blur-3xl"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute -bottom-24 -right-12 size-96 rounded-full bg-cyan-500/15 blur-3xl"
				/>
				<div className="relative z-10 flex h-full flex-col justify-between">
					{hero}
				</div>
			</section>
			<section className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-50">
				{children}
			</section>
		</div>
	);
}
