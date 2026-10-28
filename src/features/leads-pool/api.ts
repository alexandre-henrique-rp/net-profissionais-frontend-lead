/**
 * Hooks de API do Pool de leads.
 *
 * A tela nunca chama `fetch` direto: as consultas e as mutações ficam aqui,
 * com as chaves de cache e a invalidação no mesmo lugar. Assumir ou cadastrar
 * um lead invalida Pool e funil, porque o card sai de um e entra no outro.
 */

import {
	keepPreviousData,
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { type ApiPage, apiFetch, type QueryValue } from "#/lib/api";
import {
	flattenPipeline,
	onlyDigits,
	type PipelineResponse,
	type PoolFilters,
	type PoolLeadItem,
} from "./data";

export const poolQueryKey = ["leads", "pool"] as const;
export const captadorPipelineQueryKey = ["leads", "pipeline"] as const;
export const sellersQueryKey = ["users", "sellers"] as const;

/** Filtros da tela → query string do contrato (`snake_case`). */
export function toPoolQuery(filters: PoolFilters): Record<string, QueryValue> {
	return {
		q: filters.q.trim(),
		uf: filters.uf,
		sector: filters.sector,
		company_size: filters.companySize,
		temperature: filters.temperature,
		page: filters.page,
		limit: filters.limit,
	};
}

export function poolQueryOptions(filters: PoolFilters) {
	return queryOptions({
		queryKey: [...poolQueryKey, filters],
		queryFn: () =>
			apiFetch<ApiPage<PoolLeadItem>>("/leads/pool", {
				query: toPoolQuery(filters),
			}),
		// Trocar de página mantém a tabela anterior enquanto a nova chega.
		placeholderData: keepPreviousData,
		staleTime: 15_000,
	});
}

/** Lista paginada do Pool (`GET /leads/pool`). */
export function usePoolLeads(filters: PoolFilters) {
	return useQuery(poolQueryOptions(filters));
}

/**
 * Captações acompanhadas pelo captador.
 *
 * O Pool só devolve leads livres; para ver quem recebeu o lead e em que etapa
 * ele está, a fonte é o funil, achatado em uma linha por card.
 */
export function useCaptadorPipeline(enabled = true) {
	return useQuery({
		queryKey: captadorPipelineQueryKey,
		queryFn: async () =>
			flattenPipeline(await apiFetch<PipelineResponse>("/leads/pipeline")),
		staleTime: 15_000,
		enabled,
	});
}

export interface Seller {
	id: string;
	name: string;
	operationalRole: string;
	status: string;
}

/** Vendedores ativos para o diálogo de atribuição do administrador. */
export function useActiveSellers(enabled: boolean) {
	return useQuery({
		queryKey: sellersQueryKey,
		queryFn: () =>
			apiFetch<ApiPage<Seller>>("/users", {
				query: { operational_role: "VENDEDOR", status: "ACTIVE", limit: 100 },
			}),
		select: (page) => page.items,
		enabled,
		staleTime: 5 * 60_000,
	});
}

export interface ClaimLeadInput {
	id: string;
	/** Só o administrador atribui a outra pessoa; vazio = para si mesmo. */
	assignToUserId?: string;
}

/** Capta (ou atribui) um lead do Pool — `POST /leads/pool/{id}/claim`. */
export function useClaimLead() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ id, assignToUserId }: ClaimLeadInput) =>
			apiFetch<PoolLeadItem>(`/leads/pool/${id}/claim`, {
				method: "POST",
				body: assignToUserId ? { assign_to_user_id: assignToUserId } : {},
			}),
		onSettled: async () => {
			// Vale também no erro: um 409 significa que a lista em cache envelheceu.
			await Promise.all([
				client.invalidateQueries({ queryKey: poolQueryKey }),
				client.invalidateQueries({ queryKey: captadorPipelineQueryKey }),
			]);
		},
	});
}

export interface ManualLeadContact {
	name: string;
	role?: string;
	phone?: string;
	email?: string;
	birthday?: string;
	is_primary?: boolean;
	is_decision_maker?: boolean;
}

export interface ManualLeadSpecialDate {
	date_type: string;
	day_month: string;
	description?: string;
}

/** Corpo do `POST /leads/manual` (`snake_case`, como o contrato manda). */
export interface ManualLeadInput {
	person_type: "PJ" | "PF";
	cnpj?: string;
	cpf?: string;
	company_name?: string;
	trade_name?: string;
	primary_cnae?: string;
	cnae_description?: string;
	capital_social?: number;
	postal_code?: string;
	street?: string;
	number?: string;
	complement?: string;
	neighborhood?: string;
	city?: string;
	state?: string;
	sector?: string;
	company_size?: string;
	temperature?: string;
	contacts?: ManualLeadContact[];
	special_dates?: ManualLeadSpecialDate[];
	assign_to_me?: boolean;
}

/** Cadastro manual — `POST /leads/manual`. */
export function useCreateManualLead() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (input: ManualLeadInput) =>
			apiFetch<PoolLeadItem>("/leads/manual", { method: "POST", body: input }),
		onSuccess: async () => {
			await Promise.all([
				client.invalidateQueries({ queryKey: poolQueryKey }),
				client.invalidateQueries({ queryKey: captadorPipelineQueryKey }),
			]);
		},
	});
}

/** Retorno da consulta de CNPJ (`GET /integrations/cnpj/{cnpj}`). */
export interface CnpjLookup {
	company_name: string | null;
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
	company_size: string | null;
	sector: string | null;
	contacts: Array<{
		name: string;
		role: string | null;
		is_decision_maker: boolean;
	}>;
}

/** Consulta a Receita Federal pelo CNPJ digitado. */
export function useCnpjLookup() {
	return useMutation({
		mutationFn: (cnpj: string) =>
			apiFetch<CnpjLookup>(`/integrations/cnpj/${onlyDigits(cnpj)}`),
	});
}
