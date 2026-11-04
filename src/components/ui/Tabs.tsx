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
	const trackStyle =
		tone === "brand"
			? "h-[42px] gap-0 bg-[#e5e7eb] p-[3px]"
			: "h-[44px] gap-1.5 bg-slate-100 p-1";
	const tabStyle =
		tone === "brand" ? "h-[34px] text-[12px]" : "h-[36px] text-[13px]";

	return (
		<div
			role="tablist"
			className={`flex items-center rounded-lg border border-slate-200 ${trackStyle} ${className}`}
		>
			{items.map((item) => {
				const active = item.value === value;
				const activeBg =
					tone === "brand"
						? "bg-gradient-to-br from-brand-500 to-brand-600 font-bold text-white shadow-xs"
						: "bg-accent-500 font-bold text-white shadow-xs";
				const inactiveText =
					tone === "brand"
						? "font-semibold text-[#4d484d] hover:bg-white/60"
						: "font-semibold text-slate-600 hover:bg-white/60";

				return (
					<button
						key={item.value}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={() => onChange(item.value)}
						className={`flex-1 rounded-md transition-colors ${tabStyle} ${
							active ? activeBg : inactiveText
						}`}
					>
						{item.label}
					</button>
				);
			})}
		</div>
	);
}
