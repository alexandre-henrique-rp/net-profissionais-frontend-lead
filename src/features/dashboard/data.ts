/**
 * Formatação e rótulos do dashboard.
 *
 * Os números vêm de `GET /dashboard/{admin|seller|captador}`; aqui só ficam as
 * funções que transformam esses números no texto que o design mostra.
 */

import { finiteNumberOr } from "#/lib/display";

const currency = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("pt-BR", {
	maximumFractionDigits: 1,
});

const integer = new Intl.NumberFormat("pt-BR");

/** `1420000` → `R$ 1.420.000`. */
export function formatCurrency(value: number): string {
	return currency.format(finiteNumberOr(value, 0));
}

/** `3200000` → `R$ 3,2M` — rótulo curto das barras do funil. */
export function formatCompactCurrency(value: number): string {
	const amount = finiteNumberOr(value, 0);
	const absolute = Math.abs(amount);

	if (absolute >= 1_000_000) {
		return `R$ ${decimal.format(amount / 1_000_000)}M`;
	}

	if (absolute >= 1_000) {
		return `R$ ${integer.format(Math.round(amount / 1_000))} mil`;
	}

	return formatCurrency(amount);
}

/** `8.4` → `8,4%`. */
export function formatPercent(value: number): string {
	return `${decimal.format(finiteNumberOr(value, 0))}%`;
}

/** `486` → `486`. */
export function formatNumber(value: number): string {
	return integer.format(finiteNumberOr(value, 0));
}

/** `2026-10-26T09:14:00.000Z` → `26/10/2026 09:14`. */
export function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "—";
	}

	return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString(
		"pt-BR",
		{
			hour: "2-digit",
			minute: "2-digit",
		},
	)}`;
}

/** `Rafael Nunes` → `RN`. */
export function initialsOf(name: string): string {
	const parts = name
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
	return parts || "?";
}

/** Largura relativa de uma barra, com piso para o rótulo continuar legível. */
export function barWidth(value: number, maximum: number): number {
	const safeValue = finiteNumberOr(value, 0);
	const safeMaximum = finiteNumberOr(maximum, 0);
	if (safeMaximum <= 0) {
		return 0;
	}

	return Math.max(6, Math.round((safeValue / safeMaximum) * 100));
}

/** Rótulo do status do lead usado na esteira do captador. */
export const LEAD_STATUS_LABELS: Record<string, string> = {
	AVAILABLE: "Disponível no pool",
	CLAIMED: "Em carteira",
	RETURNED_TO_POOL: "Devolvido ao pool",
	LOST: "Perdido",
};

/** Rótulo do tipo de data especial. */
export const DATE_TYPE_LABELS: Record<string, string> = {
	ANIVERSARIO_CLIENTE: "Aniversário do contato",
	ANIVERSARIO_SOCIO: "Aniversário do decisor",
	ANIVERSARIO_EMPRESA: "Aniversário da empresa",
	DATA_COMEMORATIVA: "Data comemorativa",
};
