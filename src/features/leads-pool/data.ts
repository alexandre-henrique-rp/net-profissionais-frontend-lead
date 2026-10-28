/**
 * Contrato do Pool de leads e da esteira de captações.
 *
 * Os tipos espelham `GET /leads/pool` (camelCase, objetos aninhados) e
 * `GET /leads/pipeline` (snake_case, cards achatáveis). Nada aqui é dado de
 * exemplo: quem alimenta a tela é a API.
 */

export type PersonType = "PJ" | "PF";

export type LeadSector =
	| "SOLAR"
	| "TECNOLOGIA"
	| "CONSTRUCAO"
	| "SERVICOS"
	| "OUTROS";

export type CompanySize = "ME" | "EPP" | "DEMAIS";

export type LeadTemperature = "QUENTE" | "MORNO" | "FRIO";

export type PoolStatus =
	| "AVAILABLE"
	| "CLAIMED"
	| "UNASSIGNED"
	| "RETURNED_TO_POOL";

export interface LeadContact {
	id: string;
	name: string;
	role: string | null;
	phone: string | null;
	email: string | null;
	birthday: string | null;
	isPrimary: boolean;
	isDecisionMaker: boolean;
}

export interface LeadCompany {
	id: string;
	personType: PersonType;
	cnpj: string | null;
	cpf: string | null;
	companyName: string | null;
	tradeName: string | null;
	primaryCnae: string | null;
	cnaeDescription: string | null;
	capitalSocial: number | null;
	postalCode: string | null;
	street: string | null;
	number: string | null;
	complement: string | null;
	neighborhood: string | null;
	city: string | null;
	state: string | null;
	sector: LeadSector | null;
	companySize: CompanySize | null;
	temperature: LeadTemperature | null;
	temperatureScore: number | null;
	createdAt: string;
	updatedAt: string;
	contacts: LeadContact[];
}

export interface LeadStage {
	id: string;
	name: string;
	code: string;
	position: number;
	colorHex: string;
	isLostStage: boolean;
}

/** Item do `GET /leads/pool`. */
export interface PoolLeadItem {
	id: string;
	tenantId: string;
	leadId: string;
	stageId: string;
	assignedUserId: string | null;
	creatorUserId: string;
	status: PoolStatus;
	ticketValue: number | null;
	closeProbability: number | null;
	expectedCloseDate: string | null;
	proposalScope: string | null;
	lossReasonCode: string | null;
	lossReasonNotes: string | null;
	version: number;
	lastContactAt: string | null;
	createdAt: string;
	updatedAt: string;
	lead: LeadCompany;
	stage: LeadStage;
	contacts: LeadContact[];
}

/** Filtros da tela traduzidos para a query do Pool. */
export interface PoolFilters {
	q: string;
	/** `all` ou a sigla de duas letras. */
	uf: string;
	sector: string;
	companySize: string;
	/** `all`, `hot`, `warm` ou `cold`. */
	temperature: string;
	page: number;
	limit: number;
}

export const DEFAULT_POOL_FILTERS: PoolFilters = {
	q: "",
	uf: "all",
	sector: "all",
	companySize: "all",
	temperature: "all",
	page: 1,
	limit: 20,
};

/** Card achatado do `GET /leads/pipeline` para a visão do captador. */
export interface CapturedLead {
	id: string;
	companyName: string;
	document: string;
	city: string | null;
	state: string | null;
	sellerName: string | null;
	stageName: string;
	stageCode: string;
	ticketValue: number | null;
	status: string;
	lastContactAt: string | null;
}

interface PipelineCard {
	id: string;
	stage_id: string;
	status: string;
	lead: {
		company_name: string | null;
		trade_name: string | null;
		cnpj: string | null;
		city: string | null;
		state: string | null;
	};
	assigned_user: { id: string; name: string } | null;
	ticket_value: number | null;
	last_contact_at: string | null;
}

/** Resposta crua de `GET /leads/pipeline`. */
export interface PipelineResponse {
	stages: Array<{
		stage: {
			id: string;
			name: string;
			code: string;
			position: number;
			color_hex: string;
			is_lost_stage: boolean;
		};
		cards: PipelineCard[];
		count: number;
		total_value: number;
	}>;
	totals: { count: number; total_value: number };
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

export function onlyDigits(value: string): string {
	return value.replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
	const digits = onlyDigits(value);

	if (digits.length !== 14) {
		return value;
	}

	return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatCpf(value: string): string {
	const digits = onlyDigits(value);

	if (digits.length !== 11) {
		return value;
	}

	return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** `CNPJ: 33.456.789/0001-02` — ou o aviso de documento ausente. */
export function documentLabel(company: LeadCompany): string {
	if (company.cnpj) {
		return `CNPJ: ${formatCnpj(company.cnpj)}`;
	}

	if (company.cpf) {
		return `CPF: ${formatCpf(company.cpf)}`;
	}

	return company.personType === "PF"
		? "CPF não informado"
		: "CNPJ não informado";
}

/** Ticket em BRL; `—` quando o valor ainda não foi definido. */
export function formatTicket(value: number | null | undefined): string {
	if (value === null || value === undefined) {
		return "—";
	}

	return `R$ ${value.toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

/** `1982-11-14T00:00:00.000Z` → `14/11` (sem depender do fuso do navegador). */
export function dayMonth(isoDate: string | null): string | null {
	if (!isoDate) {
		return null;
	}

	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);

	return match ? `${match[3]}/${match[2]}` : null;
}

export function primaryContact(item: PoolLeadItem): LeadContact | null {
	const contacts =
		item.contacts.length > 0 ? item.contacts : item.lead.contacts;

	return (
		contacts.find((contact) => contact.isPrimary) ??
		contacts.find((contact) => contact.isDecisionMaker) ??
		contacts[0] ??
		null
	);
}

/** `Marcelo Dias (Sócio)` — cargo entre parênteses quando existe. */
export function contactLabel(item: PoolLeadItem): string {
	const contact = primaryContact(item);

	if (!contact) {
		return "Sem contato";
	}

	return contact.role ? `${contact.name} (${contact.role})` : contact.name;
}

/** Observação do card: só aparece quando o contato primário tem aniversário. */
export function birthdayLabel(item: PoolLeadItem): string | null {
	const date = dayMonth(primaryContact(item)?.birthday ?? null);

	return date ? `🎂 ANIV. DECISOR ${date}` : null;
}

export const SECTOR_LABELS: Record<LeadSector, string> = {
	SOLAR: "Solar",
	TECNOLOGIA: "Tecnologia",
	CONSTRUCAO: "Construção",
	SERVICOS: "Serviços",
	OUTROS: "Outros",
};

export function sectorLabel(sector: LeadSector | string | null): string {
	if (!sector) {
		return "Não informado";
	}

	return SECTOR_LABELS[sector as LeadSector] ?? sector;
}

export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
	ME: "ME",
	EPP: "EPP",
	DEMAIS: "Demais",
};

export const TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
	QUENTE: "Quente",
	MORNO: "Morno",
	FRIO: "Frio",
};

/** Opções dos selects da tela (valor enviado na query × rótulo). */
export const UF_OPTIONS = [
	{ value: "all", label: "Todas" },
	{ value: "MG", label: "MG" },
	{ value: "SP", label: "SP" },
	{ value: "RJ", label: "RJ" },
	{ value: "DF", label: "DF" },
	{ value: "GO", label: "GO" },
	{ value: "ES", label: "ES" },
	{ value: "BA", label: "BA" },
	{ value: "PR", label: "PR" },
	{ value: "SC", label: "SC" },
	{ value: "RS", label: "RS" },
];

export const SECTOR_OPTIONS = [
	{ value: "all", label: "Todos" },
	...Object.entries(SECTOR_LABELS).map(([value, label]) => ({ value, label })),
];

export const COMPANY_SIZE_OPTIONS = [
	{ value: "all", label: "Todos" },
	{ value: "ME", label: "ME" },
	{ value: "EPP", label: "EPP" },
	{ value: "DEMAIS", label: "Demais" },
];

export const TEMPERATURE_OPTIONS = [
	{ value: "all", label: "Todas" },
	{ value: "hot", label: "Quente" },
	{ value: "warm", label: "Morno" },
	{ value: "cold", label: "Frio" },
];

/** Achata as etapas do funil em uma linha por captação. */
export function flattenPipeline(pipeline: PipelineResponse): CapturedLead[] {
	return pipeline.stages.flatMap((group) =>
		group.cards.map((card) => ({
			id: card.id,
			companyName: card.lead.company_name ?? card.lead.trade_name ?? "Empresa",
			document: card.lead.cnpj
				? `CNPJ: ${formatCnpj(card.lead.cnpj)}`
				: "CNPJ não informado",
			city: card.lead.city,
			state: card.lead.state,
			sellerName: card.assigned_user?.name ?? null,
			stageName: group.stage.name,
			stageCode: group.stage.code,
			ticketValue: card.ticket_value,
			status: card.status,
			lastContactAt: card.last_contact_at,
		})),
	);
}
