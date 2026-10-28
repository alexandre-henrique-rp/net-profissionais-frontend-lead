import type { ReactNode } from "react";

export interface TableColumn<T> {
	key: string;
	header: string;
	render: (row: T) => ReactNode;
	className?: string;
}

export interface DataTableProps<T> {
	columns: TableColumn<T>[];
	rows: T[];
	rowKey: (row: T) => string;
	emptyLabel?: string;
	rowClassName?: (row: T) => string;
}

/** Tabela do Penpot: cabeçalho cinza-claro, linhas brancas com divisória. */
export function DataTable<T>({
	columns,
	rows,
	rowKey,
	emptyLabel = "Nada por aqui.",
	rowClassName,
}: DataTableProps<T>) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-left">
				<thead>
					<tr className="border-b border-line bg-canvas">
						{columns.map((column) => (
							<th
								key={column.key}
								className={`px-5 py-3 text-[11px] font-bold tracking-wide text-ink-muted uppercase ${column.className ?? ""}`}
							>
								{column.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.length === 0 ? (
						<tr>
							<td
								colSpan={columns.length}
								className="px-5 py-10 text-center text-[12px] text-ink-subtle"
							>
								{emptyLabel}
							</td>
						</tr>
					) : (
						rows.map((row) => (
							<tr
								key={rowKey(row)}
								className={`border-b border-line last:border-b-0 hover:bg-canvas/60 ${rowClassName?.(row) ?? ""}`}
							>
								{columns.map((column) => (
									<td
										key={column.key}
										className={`px-5 py-4 align-middle ${column.className ?? ""}`}
									>
										{column.render(row)}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
