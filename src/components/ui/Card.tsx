import type { ReactNode } from "react";

export interface CardProps {
	children: ReactNode;
	className?: string;
}

/** Superfície padrão: fundo branco, borda da linha do design e raio de 12px. */
export function Card({ children, className = "" }: CardProps) {
	return (
		<div
			className={`rounded-lg border border-line bg-surface shadow-sm ${className}`}
		>
			{children}
		</div>
	);
}

export interface CardHeaderProps {
	title: string;
	subtitle?: string;
	actions?: ReactNode;
}

/** Cabeçalho de tabela do Penpot: fundo cinza-claro e rótulos em caixa alta. */
export function CardHeader({ title, subtitle, actions }: CardHeaderProps) {
	return (
		<div className="flex items-center justify-between gap-4 border-b border-line bg-canvas px-4 py-3">
			<div>
				<h2 className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">
					{title}
				</h2>
				{subtitle ? (
					<p className="mt-0.5 text-[11px] text-ink-subtle">{subtitle}</p>
				) : null}
			</div>
			{actions}
		</div>
	);
}
