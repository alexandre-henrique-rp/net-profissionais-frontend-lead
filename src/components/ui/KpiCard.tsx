export interface KpiCardProps {
	label: string;
	value: string;
	/** Variação em relação ao período anterior. */
	delta?: { value: string; tone: "up" | "down" };
	hint?: string;
	sparkline?: number[];
	sparklineTone?: "brand" | "success" | "info" | "accent";
	progress?: number;
	valueClassName?: string;
	borderClassName?: string;
	bgClassName?: string;
}

const DELTA_TONE = {
	up: "text-success-600",
	down: "text-brand-600",
} as const;

const SPARKLINE_TONE = {
	brand: { line: "stroke-brand-500", bar: "bg-brand-500" },
	success: { line: "stroke-success-500", bar: "bg-success-500" },
	info: { line: "stroke-info-500", bar: "bg-info-500" },
	accent: { line: "stroke-violet-500", bar: "bg-violet-500" },
} as const;

function sparklinePoints(values: number[]) {
	const min = Math.min(...values);
	const range = Math.max(...values) - min || 1;
	return values
		.map((value, index) => {
			const x = 3 + (index / Math.max(values.length - 1, 1)) * 58;
			const y = 21 - ((value - min) / range) * 16;
			return `${x},${y}`;
		})
		.join(" ");
}

/** Card de indicador do dashboard — label, valor e variação. */
export function KpiCard({
	label,
	value,
	delta,
	hint,
	sparkline,
	sparklineTone = "brand",
	progress,
	valueClassName = "text-ink-strong",
	borderClassName = "border-line",
	bgClassName = "bg-surface",
}: KpiCardProps) {
	const tone = SPARKLINE_TONE[sparklineTone];

	return (
		<div
			className={`min-h-[124px] rounded-xl border p-4 shadow-xs transition-shadow hover:shadow-sm ${borderClassName} ${bgClassName}`}
		>
			<div className="flex items-start justify-between gap-3">
				<p className="text-[10px] font-bold tracking-wider text-ink-dim uppercase">
					{label}
				</p>
				{sparkline && sparkline.length > 1 ? (
					<svg
						aria-hidden="true"
						viewBox="0 0 64 24"
						className="mt-0.5 h-5 w-16 shrink-0"
					>
						<polyline
							points={sparklinePoints(sparkline)}
							className={`fill-none ${tone.line}`}
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				) : null}
			</div>
			<p
				className={`mt-1 text-[23px] font-black leading-tight tracking-tight ${valueClassName}`}
			>
				{value}
			</p>
			{delta ? (
				<p className={`mt-0.5 text-[11px] font-bold ${DELTA_TONE[delta.tone]}`}>
					{delta.value}
				</p>
			) : null}
			{hint ? (
				<p className="mt-0.5 text-[11px] text-ink-subtle">{hint}</p>
			) : null}
			{progress !== undefined ? (
				<div
					aria-hidden="true"
					className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-soft"
				>
					<span
						className={`block h-full rounded-full ${tone.bar}`}
						style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
					/>
				</div>
			) : null}
		</div>
	);
}
