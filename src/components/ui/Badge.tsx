import type { ReactNode } from "react";

export type BadgeTone =
	| "neutral"
	| "accent"
	| "success"
	| "warning"
	| "info"
	| "violet"
	| "brand";

const TONES: Record<BadgeTone, string> = {
	neutral: "bg-ink-soft text-ink",
	accent: "bg-accent-50 text-accent-500",
	success: "bg-success-50 text-success-600",
	warning: "bg-warning-50 text-warning-500 border border-warning-200",
	info: "bg-info-50 text-info-500",
	violet: "bg-violet-50 text-violet-500 border border-violet-200",
	brand: "bg-brand-50 text-brand-600 border border-brand-500",
};

export interface BadgeProps {
	tone?: BadgeTone;
	children: ReactNode;
	className?: string;
}

/** Pílula do design system — origem do lead, status, emblema de página. */
export function Badge({
	tone = "neutral",
	children,
	className = "",
}: BadgeProps) {
	return (
		<span
			className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold ${TONES[tone]} ${className}`}
		>
			{children}
		</span>
	);
}
