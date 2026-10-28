export interface TabItem<T extends string> {
	value: T;
	label: string;
}

export interface TabsProps<T extends string> {
	items: TabItem<T>[];
	value: T;
	onChange: (value: T) => void;
	className?: string;
	tone?: "accent" | "brand";
}

/**
 * Trilha de abas — mesma leitura do card de login do Penpot: trilho cinza,
 * aba ativa preenchida e texto em cima.
 */
export function Tabs<T extends string>({
	items,
	value,
	onChange,
	className = "",
	tone = "accent",
}: TabsProps<T>) {
	return (
		<div
			role="tablist"
			className={`flex h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1 ${className}`}
		>
			{items.map((item) => {
				const active = item.value === value;
				const activeBg =
					tone === "brand"
						? "bg-brand-500 font-bold text-white shadow-xs"
						: "bg-accent-500 font-bold text-white shadow-xs";

				return (
					<button
						key={item.value}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onChange(item.value)}
						className={`h-[36px] flex-1 rounded-md text-[13px] transition-colors ${
							active
								? activeBg
								: "font-semibold text-slate-600 hover:bg-white/60"
						}`}
					>
						{item.label}
					</button>
				);
			})}
		</div>
	);
}
