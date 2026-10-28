/**
 * Dublê de API para os testes de tela.
 *
 * O frontend fala com o backend por `fetch`; nos testes esse `fetch` é
 * substituído por uma tabela de rotas com respostas determinísticas. Cada
 * teste pode sobrescrever só a rota que precisa — o resto continua igual.
 *
 * As fixtures imitam o contrato real (mesmos nomes de campo e mesmos valores
 * de enum), para que um erro de integração apareça no teste e não na tela.
 */

import { vi } from "vitest";
import { API_BASE_URL } from "#/lib/api";

export interface MockResponse {
	status?: number;
	/** Corpo JSON: entra no envelope `{ success, data }` automaticamente. */
	body?: unknown;
	/** Corpo cru (arquivos, texto) — não recebe envelope. */
	raw?: BodyInit;
	headers?: Record<string, string>;
}

export interface MockContext {
	url: URL;
	method: string;
	body: unknown;
	params: Record<string, string>;
}

export type MockHandler = (
	context: MockContext,
) => MockResponse | Promise<MockResponse>;

const API_PATH = (() => {
	try {
		return new URL(API_BASE_URL).pathname.replace(/\/+$/, "");
	} catch {
		return "/api/v1";
	}
})();

/** `/api/v1/leads/pool?x=1` → `/leads/pool`. */
function relativePath(pathname: string): string {
	const withoutBase = pathname.startsWith(API_PATH)
		? pathname.slice(API_PATH.length)
		: pathname;

	return withoutBase === "" ? "/" : withoutBase;
}

/** Casa `/leads/:id/claim` com `/leads/abc/claim` e devolve os parâmetros. */
function matchPath(
	pattern: string,
	pathname: string,
): Record<string, string> | null {
	const expected = pattern.split("/").filter(Boolean);
	const actual = pathname.split("/").filter(Boolean);

	if (expected.length !== actual.length) {
		return null;
	}

	const params: Record<string, string> = {};

	for (let index = 0; index < expected.length; index += 1) {
		const segment = expected[index];

		if (segment.startsWith(":")) {
			params[segment.slice(1)] = decodeURIComponent(actual[index]);
			continue;
		}

		if (segment !== actual[index]) {
			return null;
		}
	}

	return params;
}

function envelope(data: unknown): MockResponse {
	return {
		body: {
			success: true,
			data,
			meta: { timestamp: "2026-10-26T12:00:00.000Z", version: "v1" },
		},
	};
}

function failure(status: number, code: string, message: string): MockResponse {
	return {
		status,
		body: {
			success: false,
			error: {
				code,
				message,
				timestamp: "2026-10-26T12:00:00.000Z",
				...(status === 429 ? { retry_after_seconds: 900 } : {}),
			},
		},
	};
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const TENANT = {
	id: "tenant-1",
	name: "NetProfissional",
	tradeName: "NetProfissional",
};

export const ADMIN_USER = {
	id: "user-admin",
	name: "Alexandre Henrique",
	email: "carlos.admin@netprofissional.com.br",
	role: "ADMIN",
	operationalRole: "ADMIN",
	status: "ACTIVE",
	lastLoginAt: null,
	createdAt: "2026-08-12T12:00:00.000Z",
};

export const SELLER_USER = {
	...ADMIN_USER,
	id: "user-seller",
	name: "Rafael Nunes",
	email: "rafael.nunes@netprofissional.com.br",
	role: "USUARIO",
	operationalRole: "VENDEDOR",
};

export const CAPTADOR_USER = {
	...ADMIN_USER,
	id: "user-captador",
	name: "Mariana Costa",
	email: "mariana.costa@netprofissional.com.br",
	role: "USUARIO",
	operationalRole: "CAPTADOR",
};

export function meResponse(user: typeof ADMIN_USER = ADMIN_USER): {
	user: typeof ADMIN_USER;
	tenant: typeof TENANT;
} {
	return { user, tenant: TENANT };
}

const STAGES = [
	{
		id: "stage-1",
		name: "1. Novo Lead / Recebido",
		code: "1_novo_lead",
		position: 1,
		color_hex: "#38BDF8",
		is_lost_stage: false,
	},
	{
		id: "stage-2",
		name: "2. Qualificação",
		code: "2_qualificacao",
		position: 2,
		color_hex: "#8B5CF6",
		is_lost_stage: false,
	},
	{
		id: "stage-3",
		name: "3. Apresentação / Reunião",
		code: "3_apresentacao",
		position: 3,
		color_hex: "#F59E0B",
		is_lost_stage: false,
	},
	{
		id: "stage-4",
		name: "4. Envio de Proposta",
		code: "4_proposta",
		position: 4,
		color_hex: "#EB3A42",
		is_lost_stage: false,
	},
	{
		id: "stage-5",
		name: "5. Negociação",
		code: "5_negociacao",
		position: 5,
		color_hex: "#D60037",
		is_lost_stage: false,
	},
	{
		id: "stage-6",
		name: "6. Fechado / Ganho",
		code: "6_fechado_ganho",
		position: 6,
		color_hex: "#10B981",
		is_lost_stage: false,
	},
	{
		id: "stage-7",
		name: "7. Perdido",
		code: "7_perdido",
		position: 7,
		color_hex: "#737887",
		is_lost_stage: true,
	},
];

export const DASHBOARD_ADMIN = {
	kpis: {
		total_leads: 486,
		leads_in_pool: 144,
		leads_claimed: 342,
		leads_won: 41,
		leads_lost: 23,
		conversion_rate: 8.4,
		conversion_rate_basis: "won_over_total",
		pipeline_total_value: 1420000,
		won_total_value: 492500,
		average_ticket: 28400,
		inactivity_alerts: 4,
	},
	funnel: STAGES.map((stage, index) => ({
		stage_id: stage.id,
		stage_name: stage.name,
		code: stage.code,
		position: stage.position,
		color_hex: stage.color_hex,
		count: [86, 64, 42, 28, 17, 41, 23][index],
		total_value: [1200000, 980000, 760000, 540000, 320000, 492500, 180000][
			index
		],
	})),
	loss_reasons: [
		{ code: "preco", label: "Preço", count: 12, percentage: 52.2 },
		{ code: "concorrencia", label: "Concorrência", count: 7, percentage: 30.4 },
		{ code: "timing", label: "Timing", count: 4, percentage: 17.4 },
	],
	sellers: [
		{
			user_id: "user-seller",
			name: "Rafael Nunes",
			claimed_count: 42,
			won_count: 9,
			total_value: 312000,
		},
		{
			user_id: "user-captador",
			name: "Mariana Costa",
			claimed_count: 31,
			won_count: 6,
			total_value: 204000,
		},
	],
	period: {
		from: "2026-10-01T03:00:00.000Z",
		to: "2026-11-01T02:59:59.999Z",
		label: "Este mês",
	},
};

export const DASHBOARD_SELLER = {
	kpis: {
		my_leads: 37,
		my_won: 5,
		my_lost: 3,
		my_conversion_rate: 13.5,
		my_conversion_rate_basis: "won_over_total",
		my_pipeline_value: 320000,
		my_won_value: 96000,
		today_tasks: 3,
		today_tasks_total: 7,
	},
	my_funnel: DASHBOARD_ADMIN.funnel,
	today_tasks: [
		{
			tenant_lead_id: "tenant-lead-1",
			company_name: "Solar Tech Engenharia",
			stage_name: "2. Qualificação",
			reason: "Sem contato há mais de 48h",
		},
		{
			tenant_lead_id: "tenant-lead-2",
			company_name: "Construtora Aliança Minas",
			stage_name: "3. Apresentação / Reunião",
			reason: "Previsão de fechamento vencida",
		},
	],
	birthdays: [
		{
			lead_id: "lead-6",
			company_name: "Clínica Vida Plena",
			contact_name: "Ana Beatriz",
			date_type: "ANIVERSARIO_CLIENTE",
			day_month: "29/10",
			days_until: 3,
			is_today: false,
		},
	],
};

export const DASHBOARD_CAPTADOR = {
	kpis: {
		captured_total: 52,
		captured_in_pool: 18,
		captured_claimed: 24,
		captured_won: 10,
		conversion_rate: 19.2,
		conversion_rate_basis: "won_over_total",
		captured_total_value: 890000,
	},
	by_status: [
		{ status: "AVAILABLE", count: 18 },
		{ status: "CLAIMED", count: 24 },
		{ status: "LOST", count: 0 },
	],
	recent: [
		{
			tenant_lead_id: "tenant-lead-1",
			company_name: "Solar Tech Engenharia LTDA",
			created_at: "2026-10-26T09:14:00.000Z",
			status: "AVAILABLE",
		},
	],
};

interface PoolLeadInput {
	id: string;
	name: string;
	tradeName: string;
	cnpj: string;
	sector: string;
	city: string;
	state: string;
	companySize: string;
	ticket: number;
	contactName: string;
	contactRole: string;
	phone: string;
	birthday: string | null;
	temperature: string;
}

const POOL_LEADS: PoolLeadInput[] = [
	{
		id: "tenant-lead-1",
		name: "Solar Tech Engenharia LTDA",
		tradeName: "Solar Tech",
		cnpj: "33456789000102",
		sector: "SOLAR",
		city: "Belo Horizonte",
		state: "MG",
		companySize: "EPP",
		ticket: 42000,
		contactName: "Marcelo Dias",
		contactRole: "Sócio",
		phone: "31988887777",
		birthday: "1982-11-14T00:00:00.000Z",
		temperature: "QUENTE",
	},
	{
		id: "tenant-lead-2",
		name: "Construtora Aliança Minas LTDA",
		tradeName: "Aliança Minas",
		cnpj: "44987654000111",
		sector: "CONSTRUCAO",
		city: "Uberlândia",
		state: "MG",
		companySize: "DEMAIS",
		ticket: 85000,
		contactName: "Renata Duarte",
		contactRole: "Engenheira",
		phone: "31991112233",
		birthday: "1979-04-08T00:00:00.000Z",
		temperature: "MORNO",
	},
	{
		id: "tenant-lead-3",
		name: "Agropecuária Triângulo Mineiro S/A",
		tradeName: "Triângulo Agro",
		cnpj: "11222333000144",
		sector: "OUTROS",
		city: "Uberaba",
		state: "MG",
		companySize: "DEMAIS",
		ticket: 130000,
		contactName: "Geraldo Magela",
		contactRole: "Diretor",
		phone: "31981112233",
		birthday: "1970-10-25T00:00:00.000Z",
		temperature: "QUENTE",
	},
	{
		id: "tenant-lead-4",
		name: "Indústria Química Horizonte LTDA",
		tradeName: "Química Horizonte",
		cnpj: "77888999000112",
		sector: "SERVICOS",
		city: "Contagem",
		state: "MG",
		companySize: "EPP",
		ticket: 55000,
		contactName: "Fernando Rocha",
		contactRole: "Gerente",
		phone: "31977776611",
		birthday: null,
		temperature: "FRIO",
	},
];

function poolItem(input: PoolLeadInput, index: number) {
	const contact = {
		id: `contact-${index + 1}`,
		name: input.contactName,
		role: input.contactRole,
		phone: input.phone,
		email: null,
		birthday: input.birthday,
		isPrimary: true,
		isDecisionMaker: true,
	};

	return {
		id: input.id,
		tenantId: TENANT.id,
		leadId: `lead-${index + 1}`,
		stageId: "stage-1",
		assignedUserId: null,
		creatorUserId: CAPTADOR_USER.id,
		status: "AVAILABLE",
		ticketValue: input.ticket,
		closeProbability: null,
		expectedCloseDate: null,
		proposalScope: null,
		lossReasonCode: null,
		lossReasonNotes: null,
		version: 1,
		lastContactAt: null,
		createdAt: "2026-10-20T12:00:00.000Z",
		updatedAt: "2026-10-20T12:00:00.000Z",
		lead: {
			id: `lead-${index + 1}`,
			personType: "PJ",
			cnpj: input.cnpj,
			cpf: null,
			companyName: input.name,
			tradeName: input.tradeName,
			primaryCnae: "4321500",
			cnaeDescription: "Instalação e manutenção elétrica",
			capitalSocial: 150000,
			postalCode: "30130-110",
			street: "Av. Afonso Pena",
			number: "1500",
			complement: "Sala 402",
			neighborhood: "Centro",
			city: input.city,
			state: input.state,
			sector: input.sector,
			companySize: input.companySize,
			temperature: input.temperature,
			temperatureScore: 88,
			createdAt: "2026-10-20T12:00:00.000Z",
			updatedAt: "2026-10-20T12:00:00.000Z",
			contacts: [contact],
		},
		stage: STAGES[0],
		contacts: [contact],
	};
}

export const POOL_ITEMS = POOL_LEADS.map(poolItem);

export const POOL_PAGE = {
	items: POOL_ITEMS,
	meta: { page: 1, limit: 20, total: POOL_ITEMS.length, has_more: false },
};

function pipelineCard(
	index: number,
	input: PoolLeadInput,
	stageIndex: number,
	extra: Record<string, unknown> = {},
) {
	return {
		id: input.id,
		stage_id: STAGES[stageIndex].id,
		status: "CLAIMED",
		lead: {
			company_name: input.name.replace(/ LTDA$/, ""),
			trade_name: input.tradeName,
			cnpj: input.cnpj,
			city: input.city,
			state: input.state,
		},
		assigned_user: {
			id: index % 2 === 0 ? SELLER_USER.id : CAPTADOR_USER.id,
			name: index % 2 === 0 ? "Alexandre Henrique" : "Mariana Costa",
		},
		ticket_value: input.ticket,
		close_probability: 60,
		expected_close_date: "2026-11-30T00:00:00.000Z",
		proposal_scope: null,
		loss_reason_code: null,
		loss_reason_notes: null,
		last_contact_at: "2026-10-25T12:00:00.000Z",
		version: 3,
		has_alert: false,
		...extra,
	};
}

const CARD_SOLAR = pipelineCard(0, POOL_LEADS[0], 0);
const CARD_ALIANCA = pipelineCard(1, POOL_LEADS[1], 1);
const CARD_HORIZONTE = pipelineCard(2, POOL_LEADS[3], 1, {
	has_alert: true,
	last_contact_at: null,
});
const CARD_AGRO = pipelineCard(3, POOL_LEADS[2], 2);
const CARD_CLINICA = {
	...pipelineCard(4, POOL_LEADS[0], 5),
	id: "tenant-lead-5",
	lead: {
		company_name: "Clínica Vida Plena",
		trade_name: "Vida Plena",
		cnpj: null,
		city: "Belo Horizonte",
		state: "MG",
	},
	ticket_value: 64000,
};
const CARD_METALURGICA = {
	...pipelineCard(5, POOL_LEADS[1], 6),
	id: "tenant-lead-6",
	lead: {
		company_name: "Metalúrgica São Jorge",
		trade_name: "São Jorge",
		cnpj: null,
		city: "Betim",
		state: "MG",
	},
	ticket_value: 22000,
	loss_reason_code: "preco",
	loss_reason_notes: "Concorrente com preço menor.",
};

export const PIPELINE = {
	stages: STAGES.map((stage, index) => {
		const cards = [
			[CARD_SOLAR],
			[CARD_ALIANCA, CARD_HORIZONTE],
			[CARD_AGRO],
			[],
			[],
			[CARD_CLINICA],
			[CARD_METALURGICA],
		][index];

		return {
			stage,
			cards,
			count: cards.length,
			total_value: cards.reduce(
				(total, card) => total + (card.ticket_value ?? 0),
				0,
			),
		};
	}),
	totals: { count: 6, total_value: 398000 },
};

export const LEAD_DETAIL = {
	id: "tenant-lead-1",
	version: 3,
	status: "CLAIMED",
	ticket_value: 42000,
	close_probability: 60,
	expected_close_date: "2026-11-30T00:00:00.000Z",
	proposal_scope: null,
	loss_reason_code: null,
	loss_reason_notes: null,
	last_contact_at: "2026-10-26T12:00:00.000Z",
	stage: STAGES[1],
	assigned_user: {
		id: SELLER_USER.id,
		name: "Alexandre Henrique",
		email: SELLER_USER.email,
	},
	lead: {
		id: "lead-1",
		person_type: "PJ",
		cnpj: "33456789000102",
		cpf: null,
		company_name: "Solar Tech Engenharia",
		trade_name: "Solar Tech",
		primary_cnae: "4321500",
		cnae_description: "Instalação e manutenção elétrica",
		capital_social: 150000,
		postal_code: "30130-110",
		street: "Av. Afonso Pena",
		number: "1500",
		complement: "Sala 402",
		neighborhood: "Centro",
		city: "Belo Horizonte",
		state: "MG",
		sector: "SOLAR",
		company_size: "EPP",
		temperature: "QUENTE",
		temperature_score: 88,
	},
	timeline: [
		{
			id: "note-1",
			type: "NOTE",
			title: "Ligação realizada",
			content: "Cliente pediu proposta revisada.",
			created_at: "2026-10-26T12:00:00.000Z",
			user: { id: SELLER_USER.id, name: "Alexandre Henrique" },
		},
	],
	contacts: [
		{
			id: "contact-1",
			name: "Marcelo Dias",
			role: "Sócio",
			phone: "31988887777",
			email: "marcelo@solartech.com.br",
			birthday: "1982-11-14T00:00:00.000Z",
			is_primary: true,
			is_decision_maker: true,
			whatsapp_url:
				"https://web.whatsapp.com/send?phone=5531988887777&text=Ol%C3%A1%2C%20Marcelo!",
		},
	],
	special_dates: [
		{
			id: "date-1",
			date_type: "ANIVERSARIO_SOCIO",
			day_month: "14/11",
			description: "Aniversário do decisor em 14/11",
		},
	],
	fiscal: {
		cnpj: "33456789000102",
		company_name: "Solar Tech Engenharia",
		trade_name: "Solar Tech",
		primary_cnae: "4321500",
		cnae_description: "Instalação e manutenção elétrica",
		capital_social: 150000,
		company_size: "EPP",
		state: "MG",
		city: "Belo Horizonte",
		sector: "SOLAR",
	},
};

export const USERS_PAGE = {
	items: [
		ADMIN_USER,
		CAPTADOR_USER,
		SELLER_USER,
		{
			...ADMIN_USER,
			id: "user-4",
			name: "Juliana Prado",
			email: "juliana.prado@netprofissional.com.br",
			role: "USUARIO",
			operationalRole: "VENDEDOR",
			status: "PENDING",
		},
		{
			...ADMIN_USER,
			id: "user-5",
			name: "Felipe Santos",
			email: "felipe.santos@netprofissional.com.br",
			role: "USUARIO",
			operationalRole: "VENDEDOR",
			status: "BLOCKED",
		},
	],
	meta: { page: 1, limit: 20, total: 5, has_more: false },
};

export const CNPJ_LOOKUP = {
	company_name: "Empresa de demonstração",
	trade_name: "Demonstração",
	primary_cnae: "4321500",
	cnae_description: "Serviços profissionais",
	capital_social: 250000,
	postal_code: "30130-110",
	street: "Av. Afonso Pena",
	number: "1500",
	complement: "Sala 402",
	neighborhood: "Centro",
	city: "Belo Horizonte",
	state: "MG",
	company_size: "EPP",
	sector: "SOLAR",
	contacts: [
		{ name: "Marcelo Dias", role: "Sócio", is_decision_maker: true },
		{ name: "Ana Souza", role: "Financeiro", is_decision_maker: false },
	],
};

// ---------------------------------------------------------------------------
// Rotas padrão
// ---------------------------------------------------------------------------

/** Rotas que existem em qualquer teste. Ordem: específicas antes das genéricas. */
export function defaultHandlers(): Record<string, MockHandler> {
	return {
		"GET /auth/me": () => envelope(meResponse()),
		"POST /auth/login": () =>
			envelope({ user: ADMIN_USER, token: "token-de-teste" }),
		"POST /auth/logout": () => envelope({ loggedOut: true }),
		"POST /auth/forgot-password": () => envelope({ sent: true }),
		"POST /auth/reset-password": () => envelope({ reset: true }),
		"POST /auth/activate-account": () => envelope({ activated: true }),

		"GET /dashboard/admin": () => envelope(DASHBOARD_ADMIN),
		"GET /dashboard/seller": () => envelope(DASHBOARD_SELLER),
		"GET /dashboard/captador": () => envelope(DASHBOARD_CAPTADOR),

		"GET /leads/pool": () => envelope(POOL_PAGE),
		"POST /leads/manual": () => ({ status: 201, ...envelope(POOL_ITEMS[0]) }),
		"POST /leads/pool/:id/claim": () =>
			envelope({
				...POOL_ITEMS[0],
				assignedUserId: SELLER_USER.id,
				status: "CLAIMED",
			}),

		"GET /leads/pipeline": () => envelope(PIPELINE),
		"PATCH /leads/:id/stage": () =>
			envelope({ ...CARD_SOLAR, stage_id: STAGES[1].id, version: 4 }),
		"PUT /leads/:id/commercial-terms": () =>
			envelope({ ...CARD_SOLAR, ticket_value: 60000, version: 4 }),
		"POST /leads/:id/mark-as-lost": () =>
			envelope({
				...CARD_SOLAR,
				stage_id: STAGES[6].id,
				status: "LOST",
				loss_reason_code: "preco",
				version: 4,
			}),
		"GET /leads/:id": () => envelope(LEAD_DETAIL),
		"POST /leads/:id/timeline-notes": () => ({
			status: 201,
			...envelope(LEAD_DETAIL.timeline[0]),
		}),
		"POST /leads/:id/unlink": () =>
			envelope({
				...CARD_SOLAR,
				status: "RETURNED_TO_POOL",
				assigned_user: null,
				version: 4,
			}),

		"GET /leads/export": () => ({
			raw: "razao_social;cnpj\nSolar Tech;33456789000102\n",
			headers: {
				"content-type": "text/csv; charset=utf-8",
				"content-disposition": 'attachment; filename="leads.csv"',
			},
		}),

		"GET /users": () => envelope(USERS_PAGE),
		"POST /users/invite": () => ({
			status: 201,
			...envelope({
				invite_id: "invite-1",
				email: "novo@netprofissional.com.br",
				role: "USUARIO",
				operational_role: "VENDEDOR",
				expires_at: "2026-10-28T12:00:00.000Z",
				message: "Convite enviado.",
			}),
		}),
		"PATCH /users/:id": () => envelope(SELLER_USER),
		"POST /users/:id/block": () =>
			envelope({
				blocked: true,
				reassigned: 4,
				user_id: "user-5",
				status: "BLOCKED",
				transferred_to: SELLER_USER.id,
				message: "Colaborador bloqueado.",
			}),

		"GET /integrations/cnpj/:cnpj": () => envelope(CNPJ_LOOKUP),
	};
}

// ---------------------------------------------------------------------------
// Instalação
// ---------------------------------------------------------------------------

export interface ApiMock {
	/** Função instalada em `globalThis.fetch`. */
	fetch: ReturnType<typeof vi.fn>;
	/** Requisições recebidas, na ordem. */
	calls: Array<{ method: string; path: string; url: URL; body: unknown }>;
	/** Sobrescreve uma rota só neste teste. */
	set: (key: string, handler: MockHandler) => void;
}

function orderHandlers(
	handlers: Record<string, MockHandler>,
): Array<[string, MockHandler]> {
	const weight = (key: string) =>
		key.split("/").filter((part) => part.startsWith(":")).length;

	return Object.entries(handlers).sort(([a], [b]) => weight(a) - weight(b));
}

/**
 * Instala o `fetch` simulado e devolve o controlador do teste.
 *
 * Sobrescrever uma rota: `api.set("GET /leads/pool", () => ({ status: 500 }))`.
 */
export function installApiMock(
	overrides: Record<string, MockHandler> = {},
): ApiMock {
	const handlers = { ...defaultHandlers(), ...overrides };
	const calls: ApiMock["calls"] = [];

	const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const rawUrl = typeof input === "string" ? input : input.toString();
		const url = new URL(rawUrl, "http://localhost");
		const method = (init?.method ?? "GET").toUpperCase();
		const path = relativePath(url.pathname);
		const body =
			typeof init?.body === "string" ? safeJson(init.body) : undefined;

		calls.push({ method, path, url, body });

		for (const [key, handler] of orderHandlers(handlers)) {
			const [expectedMethod, pattern] = key.split(" ");
			if (expectedMethod !== method) {
				continue;
			}

			const params = matchPath(pattern, path);
			if (!params) {
				continue;
			}

			const response = await handler({ url, method, body, params });
			const status = response.status ?? 200;
			const headers = {
				"content-type": "application/json",
				...response.headers,
			};

			if (response.raw !== undefined) {
				return new Response(response.raw, { status, headers });
			}

			return new Response(JSON.stringify(response.body ?? null), {
				status,
				headers,
			});
		}

		return new Response(
			JSON.stringify({
				success: false,
				error: {
					code: "NOT_FOUND",
					message: `Rota de teste não mapeada: ${method} ${path}`,
					timestamp: "2026-10-26T12:00:00.000Z",
				},
			}),
			{ status: 404, headers: { "content-type": "application/json" } },
		);
	});

	globalThis.fetch = mock as unknown as typeof fetch;

	return {
		fetch: mock,
		calls,
		set: (key, handler) => {
			handlers[key] = handler;
		},
	};
}

function safeJson(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

/** Erros prontos para os testes de falha. */
export const mockFailures = {
	unauthorized: () => failure(401, "UNAUTHORIZED", "Sessão expirada."),
	invalidCredentials: () =>
		failure(401, "INVALID_CREDENTIALS", "E-mail ou senha inválidos."),
	rateLimit: () =>
		failure(429, "RATE_LIMIT_EXCEEDED", "Muitas tentativas de login."),
	conflict: (
		code = "CONFLICT",
		message = "Registro alterado por outra pessoa.",
	) => failure(409, code, message),
	validation: (message = "Dados inválidos.") =>
		failure(400, "VALIDATION_ERROR", message),
	serverError: () =>
		failure(500, "INTERNAL_ERROR", "Erro interno do servidor."),
};
