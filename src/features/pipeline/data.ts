/**
 * Tipos de apoio, constantes e formatadores do funil de vendas.
 *
 * Nenhum dado de lead vive aqui: o funil vem de `GET /leads/pipeline` e a
 * ficha de `GET /leads/{id}`. Este módulo só traduz e formata o que a API
 * devolve.
 */

import { finiteNumberOrNull, firstNonBlankText } from "#/lib/display";
import type { LeadDetail, PipelineCard } from "./api";

/** Oportunidade usada nas ações de perda e de movimentação. */
export interface LeadTarget {
	id: string;
	version: number;
	companyName: string;
}

/** Valores comerciais editáveis na gaveta. */
export interface TermosComerciais {
	id: string;
	version: number;
	companyName: string;
	ticketValue: number | null;
	closeProbability: number | null;
	expectedCloseDate: string | null;
	proposalScope: string | null;
}

function displayCompanyName(lead: {
	company_name: string | null;
	trade_name: string | null;
}): string {
	return (
		firstNonBlankText(lead.company_name, lead.trade_name) ?? "Empresa sem nome"
	);
}

/** Catálogo de motivos de perda aceito por `POST /leads/{id}/mark-as-lost`. */
export const MOTIVOS_PERDA: { code: string; label: string }[] = [
	{ code: "preco", label: "Preço" },
	{ code: "concorrencia", label: "Concorrência" },
	{ code: "sem_orcamento", label: "Sem orçamento" },
	{ code: "timing", label: "Timing" },
	{ code: "sem_interesse", label: "Sem interesse" },
	{ code: "outro", label: "Outro" },
];

export const MOTIVO_PERDA_LABEL: Record<string, string> = Object.fromEntries(
	MOTIVOS_PERDA.map((motivo) => [motivo.code, motivo.label]),
);

/** Rótulo de cada tipo de interação da linha do tempo. */
export const TIPO_INTERACAO_LABEL: Record<string, string> = {
	NOTE: "Nota",
	CALL: "Ligação",
	MEETING: "Reunião",
	EMAIL: "E-mail",
	WHATSAPP: "WhatsApp",
};

export function formatCurrency(value: number | null | undefined): string {
	const amount = finiteNumberOrNull(value);
	if (amount === null) return "—";

	return `R$ ${amount.toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

export function formatProbability(value: number | null | undefined): string {
	const probability = finiteNumberOrNull(value);
	return probability === null ? "Sem estimativa" : `${probability}%`;
}

/** `2026-11-30T00:00:00.000Z` ou `2026-11-30` → `30/11/2026`. */
export function formatDateBR(value: string | null | undefined): string {
	const normalized = firstNonBlankText(value);
	if (!normalized) return "Sem previsão";
	const isoDate = normalized.slice(0, 10);
	const [year, month, day] = isoDate.split("-");
	if (!year || !month || !day) return "Sem previsão";

	const parsed = new Date(`${isoDate}T00:00:00Z`);
	if (
		Number.isNaN(parsed.getTime()) ||
		parsed.toISOString().slice(0, 10) !== isoDate
	) {
		return "Sem previsão";
	}

	return `${day}/${month}/${year}`;
}

/** Formato aceito pelo `<input type="date">` (`AAAA-MM-DD`). */
export function toDateInput(value: string | null | undefined): string {
	const normalized = firstNonBlankText(value);
	return normalized ? normalized.slice(0, 10) : "";
}

/** Nome exibido no card/gaveta: fantasia quando existe, senão a razão social. */
export function cardCompanyName(card: PipelineCard): string {
	return displayCompanyName(card.lead);
}

export function cardLocation(card: PipelineCard): string {
	const city = firstNonBlankText(card.lead.city);
	const state = firstNonBlankText(card.lead.state);
	if (city && state) return `${city}/${state}`;
	return city || state || "—";
}

export function alvoDoCard(card: PipelineCard): LeadTarget {
	return {
		id: card.id,
		version: card.version,
		companyName: cardCompanyName(card),
	};
}

export function alvoDaFicha(detail: LeadDetail): LeadTarget {
	return {
		id: detail.id,
		version: detail.version,
		companyName: displayCompanyName(detail.lead),
	};
}

export function termosDoCard(card: PipelineCard): TermosComerciais {
	return {
		id: card.id,
		version: card.version,
		companyName: cardCompanyName(card),
		ticketValue: card.ticket_value,
		closeProbability: card.close_probability,
		expectedCloseDate: card.expected_close_date,
		proposalScope: card.proposal_scope,
	};
}

export function termosDaFicha(detail: LeadDetail): TermosComerciais {
	return {
		id: detail.id,
		version: detail.version,
		companyName: displayCompanyName(detail.lead),
		ticketValue: detail.ticket_value,
		closeProbability: detail.close_probability,
		expectedCloseDate: detail.expected_close_date,
		proposalScope: detail.proposal_scope,
	};
}

/** Cores do cabeçalho por código de etapa (espelham o Penpot). */
export const STAGE_HEADER_THEMES: Record<
	string,
	{ bg: string; text: string; badge: string }
> = {
	"1_novo_lead": {
		bg: "bg-sky-50 border-t-2 border-sky-400",
		text: "text-sky-800",
		badge: "bg-sky-100 text-sky-800",
	},
	"2_qualificacao": {
		bg: "bg-emerald-50 border-t-2 border-emerald-400",
		text: "text-emerald-800",
		badge: "bg-emerald-100 text-emerald-800",
	},
	"3_apresentacao": {
		bg: "bg-amber-50 border-t-2 border-amber-400",
		text: "text-amber-800",
		badge: "bg-amber-100 text-amber-800",
	},
	"4_proposta": {
		bg: "bg-purple-50 border-t-2 border-purple-400",
		text: "text-purple-800",
		badge: "bg-purple-100 text-purple-800",
	},
	"5_negociacao": {
		bg: "bg-rose-50 border-t-2 border-rose-400",
		text: "text-rose-800",
		badge: "bg-rose-100 text-rose-800",
	},
	"6_fechado_ganho": {
		bg: "bg-emerald-50 border-t-2 border-emerald-500",
		text: "text-emerald-900",
		badge: "bg-emerald-100 text-emerald-900",
	},
	"7_perdido": {
		bg: "bg-red-50 border-t-2 border-red-400",
		text: "text-red-800",
		badge: "bg-red-100 text-red-800",
	},
};

export function stageTheme(code: string) {
	return (
		STAGE_HEADER_THEMES[code] ?? {
			bg: "bg-canvas border-t-2 border-line",
			text: "text-ink-strong",
			badge: "bg-surface text-ink-muted",
		}
	);
}
