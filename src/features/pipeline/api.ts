/**
 * Cliente de dados do funil de vendas.
 *
 * Kanban, Lista e gaveta falam com a API por aqui: os tipos espelham o
 * contrato, as chaves de cache ficam num lugar só e toda mutação invalida o
 * funil (e a ficha aberta) para a tela nunca mostrar um card velho.
 */

import {
	type QueryClient,
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { ApiError, apiFetch, type QueryValue } from "#/lib/api";

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------

export interface PipelineStage {
	id: string;
	name: string;
	code: string;
	position: number;
	color_hex: string;
	is_lost_stage: boolean;
}

export interface PipelineCardLead {
	company_name: string;
	trade_name: string | null;
	cnpj: string | null;
	city: string | null;
	state: string | null;
}

export interface PipelineCard {
	id: string;
	stage_id: string;
	status: string;
	lead: PipelineCardLead;
	assigned_user: { id: string; name: string } | null;
	ticket_value: number | null;
	close_probability: number | null;
	expected_close_date: string | null;
	proposal_scope: string | null;
	loss_reason_code: string | null;
	loss_reason_notes: string | null;
	last_contact_at: string | null;
	version: number;
	has_alert: boolean;
}

export interface PipelineStageGroup {
	stage: PipelineStage;
	cards: PipelineCard[];
	count: number;
	total_value: number;
}

export interface PipelineResponse {
	stages: PipelineStageGroup[];
	totals: { count: number; total_value: number };
}

export type PipelineOrderBy =
	| "ticket_desc"
	| "ticket_asc"
	| "created_at_desc"
	| "close_date_asc"
	| "probability_desc";

export interface PipelineFilters {
	/** Código da etapa ou `all`. */
	stage?: string;
	/** `me`, `all` ou o id do vendedor. */
	assigned_user_id?: string;
	ticket_min?: number;
	ticket_max?: number;
	has_alerts?: boolean;
	q?: string;
	order_by?: PipelineOrderBy;
}

export interface LeadDetailLead {
	id: string;
	person_type: string;
	cnpj: string | null;
	cpf: string | null;
	company_name: string;
	trade_name: string | null;
	primary_cnae: string | null;
	cnae_description: string | null;
	capital_social: number | null;
	postal_code: string | null;
	street: string | null;
	number: string | null;
	complement: string | null;
	neighborhood: string | null;
	city: string | null;
	state: string | null;
	sector: string | null;
	company_size: string | null;
	temperature: string | null;
	temperature_score: number | null;
}

export interface LeadTimelineEntry {
	id: string;
	type: string;
	title: string | null;
	content: string;
	created_at: string;
	user: { id: string; name: string } | null;
}

export interface LeadContact {
	id: string;
	name: string;
	role: string | null;
	phone: string | null;
	email: string | null;
	birthday: string | null;
	is_primary: boolean;
	is_decision_maker: boolean;
	whatsapp_url: string | null;
}

export interface LeadSpecialDate {
	id: string;
	date_type: string;
	day_month: string;
	description: string;
}

export interface LeadFiscal {
	cnpj: string | null;
	company_name: string;
	trade_name: string | null;
	primary_cnae: string | null;
	cnae_description: string | null;
	capital_social: number | null;
	company_size: string | null;
	state: string | null;
	city: string | null;
	sector: string | null;
}

export interface LeadDetail {
	id: string;
	version: number;
	status: string;
	ticket_value: number | null;
	close_probability: number | null;
	expected_close_date: string | null;
	proposal_scope: string | null;
	loss_reason_code: string | null;
	loss_reason_notes: string | null;
	last_contact_at: string | null;
	stage: PipelineStage;
	assigned_user: { id: string; name: string; email: string } | null;
	lead: LeadDetailLead;
	timeline: LeadTimelineEntry[];
	contacts: LeadContact[];
	special_dates: LeadSpecialDate[];
	fiscal: LeadFiscal;
}

export type TimelineNoteType =
	| "NOTE"
	| "CALL"
	| "MEETING"
	| "EMAIL"
	| "WHATSAPP";

// ---------------------------------------------------------------------------
// Chaves de cache
// ---------------------------------------------------------------------------

export const pipelineRootKey = ["leads", "pipeline"] as const;
export const leadRootKey = ["leads", "detail"] as const;

export function pipelineQueryKey(filters: PipelineFilters) {
	return [...pipelineRootKey, filters] as const;
}

export function leadQueryKey(id: string) {
	return [...leadRootKey, id] as const;
}

export function pipelineQueryOptions(filters: PipelineFilters = {}) {
	return queryOptions({
		queryKey: pipelineQueryKey(filters),
		queryFn: () =>
			apiFetch<PipelineResponse>("/leads/pipeline", {
				query: toPipelineQuery(filters),
			}),
	});
}

/** Query só com valores preenchidos — a API não quer parâmetro vazio. */
function toPipelineQuery(filters: PipelineFilters): Record<string, QueryValue> {
	return {
		stage: filters.stage,
		assigned_user_id: filters.assigned_user_id,
		ticket_min: filters.ticket_min,
		ticket_max: filters.ticket_max,
		has_alerts: filters.has_alerts,
		q: filters.q,
		order_by: filters.order_by,
	};
}

export function leadQueryOptions(id: string) {
	return queryOptions({
		queryKey: leadQueryKey(id),
		queryFn: () => apiFetch<LeadDetail>(`/leads/${id}`),
	});
}

export function usePipeline(filters: PipelineFilters = {}) {
	return useQuery(pipelineQueryOptions(filters));
}

export function useLeadDetail(id: string | null) {
	return useQuery({
		...leadQueryOptions(id ?? ""),
		enabled: Boolean(id),
	});
}

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

/** `true` quando a API recusou a mutação por versão desatualizada. */
export function isVersionConflict(error: unknown): boolean {
	return (
		error instanceof ApiError &&
		(error.status === 409 || error.code === "VERSION_CONFLICT")
	);
}

/** Mensagem pronta para a tela a partir do erro do contrato. */
export function errorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		return error.message;
	}

	return "Não foi possível concluir a ação. Tente de novo.";
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/** Reaplica no funil em cache o card devolvido por uma mutação. */
function applyCard(client: QueryClient, card: PipelineCard) {
	client.setQueriesData<PipelineResponse>(
		{ queryKey: pipelineRootKey },
		(current) => {
			if (!current) return current;

			const withoutCard = current.stages.map((group) => ({
				...group,
				cards: group.cards.filter((item) => item.id !== card.id),
			}));
			const targetIndex = withoutCard.findIndex(
				(group) => group.stage.id === card.stage_id,
			);

			if (targetIndex === -1) return current;

			const stages = withoutCard.map((group, index) => {
				const cards =
					index === targetIndex ? [card, ...group.cards] : group.cards;

				return {
					...group,
					cards,
					count: cards.length,
					total_value: cards.reduce(
						(total, item) => total + (item.ticket_value ?? 0),
						0,
					),
				};
			});

			return {
				stages,
				totals: {
					count: stages.reduce((total, group) => total + group.count, 0),
					total_value: stages.reduce(
						(total, group) => total + group.total_value,
						0,
					),
				},
			};
		},
	);
}

/** Remove o card devolvido ao Pool do funil em cache. */
function removeCard(client: QueryClient, cardId: string) {
	client.setQueriesData<PipelineResponse>(
		{ queryKey: pipelineRootKey },
		(current) => {
			if (!current) return current;

			const stages = current.stages.map((group) => {
				const cards = group.cards.filter((item) => item.id !== cardId);

				return {
					...group,
					cards,
					count: cards.length,
					total_value: cards.reduce(
						(total, item) => total + (item.ticket_value ?? 0),
						0,
					),
				};
			});

			return {
				stages,
				totals: {
					count: stages.reduce((total, group) => total + group.count, 0),
					total_value: stages.reduce(
						(total, group) => total + group.total_value,
						0,
					),
				},
			};
		},
	);
}

function invalidatePipeline(client: QueryClient) {
	void client.invalidateQueries({ queryKey: pipelineRootKey });
}

// ---------------------------------------------------------------------------
// Mutações
// ---------------------------------------------------------------------------

export interface MoveLeadStageInput {
	id: string;
	stageId: string;
	version: number;
	lossReasonCode?: string;
	lossReasonNotes?: string;
}

/** `PATCH /leads/{id}/stage` — mover card (inclusive para a etapa de perda). */
export function useMoveLeadStage() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ id, stageId, version, ...loss }: MoveLeadStageInput) =>
			apiFetch<PipelineCard>(`/leads/${id}/stage`, {
				method: "PATCH",
				body: {
					stage_id: stageId,
					version,
					...(loss.lossReasonCode
						? {
								loss_reason_code: loss.lossReasonCode,
								loss_reason_notes: loss.lossReasonNotes,
							}
						: {}),
				},
			}),
		onSuccess: (card) => applyCard(client, card),
		// No erro (409 inclusive) o funil é recarregado para mostrar a versão real.
		onSettled: () => invalidatePipeline(client),
	});
}

export interface CommercialTermsInput {
	id: string;
	ticket_value?: number;
	close_probability?: number;
	expected_close_date?: string;
	proposal_scope?: string;
}

/** `PUT /leads/{id}/commercial-terms` — ticket, probabilidade e previsão. */
export function useSaveCommercialTerms() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...body }: CommercialTermsInput) =>
			apiFetch<PipelineCard>(`/leads/${id}/commercial-terms`, {
				method: "PUT",
				body,
			}),
		onSuccess: (card) => {
			applyCard(client, card);
			void client.invalidateQueries({ queryKey: leadQueryKey(card.id) });
		},
		onSettled: () => invalidatePipeline(client),
	});
}

export interface MarkLeadLostInput {
	id: string;
	lossReasonCode: string;
	lossReasonNotes?: string;
}

/** `POST /leads/{id}/mark-as-lost` — encerrar com motivo do catálogo. */
export function useMarkLeadLost() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ id, lossReasonCode, lossReasonNotes }: MarkLeadLostInput) =>
			apiFetch<PipelineCard>(`/leads/${id}/mark-as-lost`, {
				method: "POST",
				body: {
					loss_reason_code: lossReasonCode,
					loss_reason_notes: lossReasonNotes,
				},
			}),
		onSuccess: (card) => {
			applyCard(client, card);
			void client.invalidateQueries({ queryKey: leadQueryKey(card.id) });
		},
		onSettled: () => invalidatePipeline(client),
	});
}

export interface UnlinkLeadInput {
	id: string;
	reason?: string;
}

/** `POST /leads/{id}/unlink` — devolve a oportunidade ao Pool. */
export function useUnlinkLead() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ id, reason }: UnlinkLeadInput) =>
			apiFetch<PipelineCard>(`/leads/${id}/unlink`, {
				method: "POST",
				body: { reason },
			}),
		onSuccess: (_card, input) => {
			removeCard(client, input.id);
			client.removeQueries({ queryKey: leadQueryKey(input.id) });
		},
		onSettled: () => invalidatePipeline(client),
	});
}

export interface AddTimelineNoteInput {
	id: string;
	content: string;
	type?: TimelineNoteType;
	title?: string;
}

/**
 * `POST /leads/{id}/timeline-notes` — registra a interação.
 *
 * A nota devolvida entra na frente da linha do tempo em cache: esperar o
 * refetch faria a nota "piscar" fora da tela em conexões lentas.
 */
export function useAddTimelineNote() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...body }: AddTimelineNoteInput) =>
			apiFetch<LeadTimelineEntry>(`/leads/${id}/timeline-notes`, {
				method: "POST",
				body: { type: "NOTE", ...body },
			}),
		onSuccess: (note, input) => {
			client.setQueryData<LeadDetail>(leadQueryKey(input.id), (current) => {
				if (!current) return current;
				const timeline = current.timeline.some((item) => item.id === note.id)
					? current.timeline
					: [note, ...current.timeline];

				return { ...current, timeline };
			});
		},
	});
}
