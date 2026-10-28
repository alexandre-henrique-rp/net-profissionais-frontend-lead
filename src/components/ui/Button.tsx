import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant =
	| "primary"
	| "brand"
	| "success"
	| "info"
	| "outline"
	| "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
	primary: "bg-primary-500 text-white hover:brightness-95",
	brand: "bg-brand-500 text-white hover:bg-brand-600",
	success: "bg-success-500 text-white hover:brightness-95",
	info: "bg-info-500 text-white hover:brightness-95",
	outline: "border border-line bg-surface text-ink hover:bg-canvas",
	ghost: "text-ink hover:bg-canvas",
};

/**
 * Todos os botões do Penpot têm raio 6px e 36px de altura; o `lg` existe só
 * para o CTA do login, que o design manda em 48px.
 */
const SIZES: Record<ButtonSize, string> = {
	sm: "h-9 rounded-sm px-3 text-[11px] font-semibold",
	md: "h-9 rounded-sm px-4 text-[13px] font-bold",
	lg: "h-12 rounded-sm px-5 text-[14px] font-bold",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	children?: ReactNode;
}

/** Botão do design system — mesmos pesos e raios dos boards do Penpot. */
export function Button({
	variant = "primary",
	size = "md",
	className = "",
	type = "button",
	...props
}: ButtonProps) {
	return (
		<button
			type={type}
			className={`inline-flex items-center justify-center gap-2 whitespace-nowrap transition-[filter,background-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
			{...props}
		/>
	);
}
