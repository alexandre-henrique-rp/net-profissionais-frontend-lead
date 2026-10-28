import type { ReactNode } from "react";
import { Badge } from "../ui/Badge";

export interface PageHeaderProps {
	/** Emblema do módulo, como "📈 MONITORAMENTO & BI COMERCIAL". */
	eyebrow?: string;
	title: string;
	/** Ações à direita (filtro de período, exportação…). */
	actions?: ReactNode;
}

/**
 * Cabeçalho de página — o bloco que se repete nas quatro telas do MVP:
 * emblema, título e ações à direita.
 */
export function PageHeader({ eyebrow, title, actions }: PageHeaderProps) {
	return (
		<div className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-start sm:gap-4">
			<div className="min-w-0">
				{eyebrow ? <Badge tone="brand">{eyebrow}</Badge> : null}
				<h1 className="mt-2 text-xl leading-tight font-normal text-ink-strong">
					{title}
				</h1>
			</div>
			{actions ? (
				<div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
					{actions}
				</div>
			) : null}
		</div>
	);
}
