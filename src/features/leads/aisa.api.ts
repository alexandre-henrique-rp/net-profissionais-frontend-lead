/**
 * Hooks de API para prospecção de empresas via API REST da Aisa (`https://api.aisa.one`).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	captadorPipelineQueryKey,
	poolQueryKey,
} from "#/features/leads-pool/api";
import type { PoolLeadItem } from "#/features/leads-pool/data";
import { apiFetch } from "#/lib/api";

export type AiLlmProvider = "AISA" | "GEMINI" | "OPENAI" | "CLAUDE" | "CUSTOM";
export type AisaSearchEngine = "auto" | "tavily" | "exa" | "akta";

export const AI_LLM_PROVIDER_OPTIONS: Array<{
	value: AiLlmProvider;
	label: string;
	defaultModel: string;
	requiresOwnKey: boolean;
}> = [
	{
		value: "AISA",
		label: "Aisa Gateway (usa a chave Aisa)",
		defaultModel: "gpt-4o-mini",
		requiresOwnKey: false,
	},
	{
		value: "GEMINI",
		label: "Google Gemini",
		defaultModel: "gemini-2.5-flash",
		requiresOwnKey: true,
	},
	{
		value: "OPENAI",
		label: "OpenAI GPT",
		defaultModel: "gpt-4o-mini",
		requiresOwnKey: true,
	},
	{
		value: "CLAUDE",
		label: "Anthropic Claude",
		defaultModel: "claude-sonnet-4-5",
		requiresOwnKey: true,
	},
	{
		value: "CUSTOM",
		label: "Customizado (URL + Token)",
		defaultModel: "gpt-4o-mini",
		requiresOwnKey: true,
	},
];

export const AISA_ENGINE_OPTIONS: Array<{
	value: AisaSearchEngine;
	label: string;
}> = [
	{ value: "auto", label: "Automático (Tavily + Fallback Exa/Smart)" },
	{ value: "tavily", label: "Tavily (Web Search + Extração)" },
	{ value: "exa", label: "Exa (Busca Semântica Neural)" },
	{ value: "akta", label: "Akta (Diretório de Empresas)" },
];

export interface AisaConfig {
	hasAisaApiKey: boolean;
	aisaApiKeyHint: string | null;
	aisaBaseUrl: string;
	llmProvider: AiLlmProvider;
	llmModel: string;
	llmBaseUrl: string | null;
	hasLlmApiKey: boolean;
	llmApiKeyHint: string | null;
	updatedAt: string;
}

export interface UpdateAisaConfigInput {
	aisa_api_key?: string;
	clear_aisa_api_key?: boolean;
	aisa_base_url?: string;
	llm_provider?: AiLlmProvider;
	llm_model?: string;
	llm_api_key?: string;
	clear_llm_api_key?: boolean;
	llm_base_url?: string;
}

export interface AisaSearchInput {
	segment: string;
	city?: string;
	state?: string;
	keywords?: string;
	company_size?: "ME" | "EPP" | "DEMAIS";
	engine?: AisaSearchEngine;
	deep_extract?: boolean;
	max_results?: number;
}

export interface AisaLeadContactCandidate {
	name: string | null;
	role: string | null;
	phone: string | null;
	email: string | null;
}

export interface AisaLeadCandidate {
	companyName: string;
	tradeName: string | null;
	cnpj: string | null;
	website: string | null;
	city: string | null;
	state: string | null;
	customSector: string | null;
	companySize: "ME" | "EPP" | "DEMAIS" | null;
	temperature: "QUENTE" | "MORNO" | "FRIO";
	fitScore: number | null;
	summary: string | null;
	sourceUrl: string | null;
	sourceEngine: string;
	contact: AisaLeadContactCandidate | null;
}

export interface AisaSearchResponse {
	query: string;
	engineUsed: string;
	llmProvider: AiLlmProvider;
	llmModel: string;
	llmUsed: boolean;
	totalSources: number;
	warnings: string[];
	leads: AisaLeadCandidate[];
}

export interface AisaImportLeadItemInput {
	company_name: string;
	trade_name?: string;
	cnpj?: string;
	website?: string;
	city?: string;
	state?: string;
	custom_sector?: string;
	company_size?: "ME" | "EPP" | "DEMAIS";
	temperature?: "QUENTE" | "MORNO" | "FRIO";
	summary?: string;
	source_url?: string;
	contact?: {
		name?: string;
		role?: string;
		phone?: string;
		email?: string;
	};
}

export interface AisaImportInput {
	custom_sector?: string;
	leads: AisaImportLeadItemInput[];
}

export interface AisaImportResponse {
	importedCount: number;
	skippedCount: number;
	items: PoolLeadItem[];
	skipped: Array<{ companyName: string; reason: string }>;
}

export const aisaConfigQueryKey = ["integrations", "aisa", "config"] as const;

export function useAisaConfig(enabled: boolean) {
	return useQuery({
		queryKey: aisaConfigQueryKey,
		queryFn: () => apiFetch<AisaConfig>("/integrations/aisa/config"),
		enabled,
		staleTime: 30_000,
	});
}

export function useSaveAisaConfig() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (input: UpdateAisaConfigInput) =>
			apiFetch<AisaConfig>("/integrations/aisa/config", {
				method: "PUT",
				body: input,
			}),
		onSuccess: (data) => {
			client.setQueryData(aisaConfigQueryKey, data);
		},
	});
}

export function useSearchAisaLeads() {
	return useMutation({
		mutationFn: (input: AisaSearchInput) =>
			apiFetch<AisaSearchResponse>("/integrations/aisa/search", {
				method: "POST",
				body: input,
			}),
	});
}

export function useImportAisaLeads() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (input: AisaImportInput) =>
			apiFetch<AisaImportResponse>("/integrations/aisa/import", {
				method: "POST",
				body: input,
			}),
		onSuccess: async () => {
			await Promise.all([
				client.invalidateQueries({ queryKey: poolQueryKey }),
				client.invalidateQueries({ queryKey: captadorPipelineQueryKey }),
			]);
		},
	});
}
