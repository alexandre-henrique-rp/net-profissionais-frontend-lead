/**
 * Formatação e rótulos do dashboard.
 *
 * Os números vêm de `GET /dashboard/{admin|seller|captador}`; aqui só ficam as
 * funções que transformam esses números no texto que o design mostra.
 */

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
	return currency.format(value);
}

/** `3200000` → `R$ 3,2M` — rótulo curto das barras do funil. */
export function formatCompactCurrency(value: number): string {
	const absolute = Math.abs(value);

	if (absolute >= 1_000_000) {
		return `R$ ${decimal.format(value / 1_000_000)}M`;
	}

	if (absolute >= 1_000) {
		return `R$ ${integer.format(Math.round(value / 1_000))} mil`;
	}

	return formatCurrency(value);
}

/** `8.4` → `8,4%`. */
export function formatPercent(value: number): string {
	return `${decimal.format(value)}%`;
}

/** `486` → `486`. */
export function formatNumber(value: number): string {
	return integer.format(value);
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
	return name
		.split(" ")
		.filter(Boolean)
		.map((part) => part[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

/** Largura relativa de uma barra, com piso para o rótulo continuar legível. */
export function barWidth(value: number, maximum: number): number {
	if (maximum <= 0) {
		return 0;
	}

	return Math.max(6, Math.round((value / maximum) * 100));
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
