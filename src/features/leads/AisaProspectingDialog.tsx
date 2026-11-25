import { type FormEvent, useEffect, useState } from "react";
import { Badge } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Dialog } from "#/components/ui/Dialog";
import { Field, TextInput } from "#/components/ui/Field";
import { maskCnpj, onlyDigits, UF_OPTIONS } from "#/features/leads-pool/data";
import { ApiError } from "#/lib/api";
import {
	AI_LLM_PROVIDER_OPTIONS,
	AISA_ENGINE_OPTIONS,
	type AiLlmProvider,
	type AisaImportLeadItemInput,
	type AisaImportResponse,
	type AisaLeadCandidate,
	type AisaSearchEngine,
	useAisaConfig,
	useImportAisaLeads,
	useSaveAisaConfig,
	useSearchAisaLeads,
} from "./aisa.api";

export interface AisaProspectingDialogProps {
	open: boolean;
	onClose: () => void;
	onImported?: (result: AisaImportResponse) => void;
}

const TEMPERATURE_TONE = {
	QUENTE: "brand",
	MORNO: "warning",
	FRIO: "info",
} as const;

function errorText(error: unknown): string {
	if (error instanceof ApiError) return error.message;
	if (error instanceof Error) return error.message;
	return "Não foi possível concluir a operação.";
}

function candidateKey(candidate: AisaLeadCandidate, index: number): string {
	return `${candidate.companyName}::${candidate.website ?? candidate.sourceUrl ?? index}`;
}

function toImportPayload(
	candidate: AisaLeadCandidate,
	editedCnpj: string | undefined,
	defaultSector: string,
): AisaImportLeadItemInput {
	const cnpjDigits = onlyDigits(editedCnpj ?? candidate.cnpj ?? "");

	return {
		company_name: candidate.companyName,
		trade_name: candidate.tradeName ?? undefined,
		cnpj: cnpjDigits.length === 14 ? cnpjDigits : undefined,
		website: candidate.website ?? undefined,
		city: candidate.city ?? undefined,
		state: candidate.state ?? undefined,
		custom_sector:
			candidate.customSector?.trim() || defaultSector.trim() || undefined,
		company_size: candidate.companySize ?? undefined,
		temperature: candidate.temperature,
		summary: candidate.summary ?? undefined,
		source_url: candidate.sourceUrl ?? undefined,
		contact: candidate.contact
			? {
					name: candidate.contact.name ?? undefined,
					role: candidate.contact.role ?? undefined,
					phone: candidate.contact.phone ?? undefined,
					email: candidate.contact.email ?? undefined,
				}
			: undefined,
	};
}

/**
 * Modal de prospecção de empresas via API REST da Aisa (`https://api.aisa.one`).
 *
 * As configurações de API (Aisa + Gemini/GPT/Claude/Customizado) ficam em um
 * acordeão nativo fechado por padrão e carregado automaticamente do banco.
 */
export function AisaProspectingDialog({
	open,
	onClose,
	onImported,
}: AisaProspectingDialogProps) {
	const configQuery = useAisaConfig(open);
	const saveConfig = useSaveAisaConfig();
	const searchLeads = useSearchAisaLeads();
	const importLeads = useImportAisaLeads();

	// Estado do acordeão de configurações (carregado do banco ao abrir)
	const [aisaApiKey, setAisaApiKey] = useState("");
	const [aisaBaseUrl, setAisaBaseUrl] = useState("https://api.aisa.one");
	const [llmProvider, setLlmProvider] = useState<AiLlmProvider>("AISA");
	const [llmModel, setLlmModel] = useState("gpt-4o-mini");
	const [llmApiKey, setLlmApiKey] = useState("");
	const [llmBaseUrl, setLlmBaseUrl] = useState("");
	const [configSaved, setConfigSaved] = useState(false);
	const [configDirty, setConfigDirty] = useState(false);

	// Estado da pesquisa
	const [segment, setSegment] = useState("");
	const [city, setCity] = useState("");
	const [state, setState] = useState("all");
	const [companySize, setCompanySize] = useState<"" | "ME" | "EPP" | "DEMAIS">(
		"",
	);
	const [keywords, setKeywords] = useState("");
	const [engine, setEngine] = useState<AisaSearchEngine>("auto");
	const [maxResults, setMaxResults] = useState(10);
	const [deepExtract, setDeepExtract] = useState(true);

	// Estado dos resultados e importação
	const [results, setResults] = useState<AisaLeadCandidate[]>([]);
	const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
	const [importedKeys, setImportedKeys] = useState<Set<string>>(new Set());
	const [editedCnpjs, setEditedCnpjs] = useState<Record<string, string>>({});
	const [importSector, setImportSector] = useState("");
	const [importFeedback, setImportFeedback] = useState("");

	useEffect(() => {
		if (!open) {
			setConfigDirty(false);
			return;
		}
		if (!configQuery.data || configDirty) return;
		setAisaBaseUrl(configQuery.data.aisaBaseUrl);
		setLlmProvider(configQuery.data.llmProvider);
		setLlmModel(configQuery.data.llmModel);
		setLlmBaseUrl(configQuery.data.llmBaseUrl ?? "");
	}, [open, configQuery.data, configDirty]);

	function handleProviderChange(next: AiLlmProvider) {
		const previousDefault = AI_LLM_PROVIDER_OPTIONS.find(
			(item) => item.value === llmProvider,
		)?.defaultModel;
		const nextDefault = AI_LLM_PROVIDER_OPTIONS.find(
			(item) => item.value === next,
		)?.defaultModel;

		setLlmProvider(next);
		if (!llmModel.trim() || llmModel === previousDefault) {
			if (nextDefault) setLlmModel(nextDefault);
		}
		setConfigDirty(true);
		setConfigSaved(false);
	}

	async function handleSaveConfig(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setConfigSaved(false);

		try {
			await saveConfig.mutateAsync({
				aisa_api_key: aisaApiKey.trim() || undefined,
				aisa_base_url: aisaBaseUrl.trim() || undefined,
				llm_provider: llmProvider,
				llm_model: llmModel.trim() || undefined,
				llm_api_key: llmApiKey.trim() || undefined,
				llm_base_url:
					llmProvider === "CUSTOM" ? llmBaseUrl.trim() || undefined : undefined,
			});
			setAisaApiKey("");
			setLlmApiKey("");
			setConfigSaved(true);
		} catch {
			// O erro é exibido pelo estado `saveConfig.error`.
		}
	}

	async function handleSearch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!segment.trim()) return;
		setImportFeedback("");

		try {
			const response = await searchLeads.mutateAsync({
				segment: segment.trim(),
				city: city.trim() || undefined,
				state: state === "all" ? undefined : state,
				company_size: companySize || undefined,
				keywords: keywords.trim() || undefined,
				engine,
				deep_extract: deepExtract,
				max_results: maxResults,
			});

			setResults(response.leads);
			setImportSector(segment.trim());
			setImportedKeys(new Set());
			const allKeys = new Set(
				response.leads.map((lead, idx) => candidateKey(lead, idx)),
			);
			setSelectedKeys(allKeys);
			const cnpjMap: Record<string, string> = {};
			response.leads.forEach((lead, idx) => {
				if (lead.cnpj) {
					cnpjMap[candidateKey(lead, idx)] = maskCnpj(lead.cnpj);
				}
			});
			setEditedCnpjs(cnpjMap);
		} catch {
			// O erro é exibido pelo estado `searchLeads.error`.
		}
	}

	function toggleSelect(key: string) {
		setSelectedKeys((current) => {
			const next = new Set(current);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	}

	function toggleSelectAll(checked: boolean) {
		if (!checked) {
			setSelectedKeys(new Set());
			return;
		}
		const available = results
			.map((lead, idx) => candidateKey(lead, idx))
			.filter((key) => !importedKeys.has(key));
		setSelectedKeys(new Set(available));
	}

	async function handleImport(keysToImport: string[]) {
		const targetSet = new Set(keysToImport);
		const chosenEntries = results
			.map((lead, idx) => ({ lead, key: candidateKey(lead, idx) }))
			.filter(({ key }) => targetSet.has(key) && !importedKeys.has(key));

		if (chosenEntries.length === 0) return;

		setImportFeedback("");
		try {
			const response = await importLeads.mutateAsync({
				custom_sector: importSector.trim() || segment.trim() || undefined,
				leads: chosenEntries.map(({ lead, key }) =>
					toImportPayload(lead, editedCnpjs[key], importSector || segment),
				),
			});

			setImportedKeys((current) => {
				const next = new Set(current);
				for (const { key } of chosenEntries) {
					next.add(key);
				}
				return next;
			});
			setSelectedKeys((current) => {
				const next = new Set(current);
				for (const { key } of chosenEntries) {
					next.delete(key);
				}
				return next;
			});

			const parts = [
				`${response.importedCount} lead(s) importado(s) para o Pool.`,
			];
			if (response.skippedCount > 0) {
				parts.push(
					`${response.skippedCount} já existente(s): ${response.skipped.map((s) => s.companyName).join(", ")}.`,
				);
			}
			setImportFeedback(parts.join(" "));
			onImported?.(response);
		} catch {
			// O erro é exibido pelo estado `importLeads.error`.
		}
	}

	const configured = configQuery.data?.hasAisaApiKey ?? false;
	const pendingResultsCount = results.filter(
		(lead, idx) => !importedKeys.has(candidateKey(lead, idx)),
	).length;
	const allSelected =
		pendingResultsCount > 0 && selectedKeys.size === pendingResultsCount;

	return (
		<Dialog
			open={open}
			title="Prospecção de Leads com Aisa"
			description="Pesquise empresas pela API da Aisa e importe direto para o Pool de Leads."
			onClose={onClose}
			className="max-w-[880px]"
		>
			<div className="grid gap-5">
				{/* Acordeão de Configurações — fechado por padrão */}
				<details className="aisa-accordion rounded-xl border border-line bg-canvas">
					<summary className="cursor-pointer select-none px-4 py-3 text-xs font-bold text-ink-strong">
						<span>Configurações de API (Aisa & Provedor de IA)</span>
						<span className="ml-auto">
							{configQuery.isPending ? (
								<Badge tone="neutral">Carregando…</Badge>
							) : configured ? (
								<Badge tone="success">Configurado</Badge>
							) : (
								<Badge tone="warning">Chave Aisa pendente</Badge>
							)}
						</span>
					</summary>

					<form
						onSubmit={handleSaveConfig}
						className="grid gap-3.5 border-t border-line px-4 py-4"
					>
						<div className="grid gap-3 sm:grid-cols-2">
							<Field
								label="Chave da API Aisa"
								hint={
									configQuery.data?.hasAisaApiKey
										? `Chave salva no banco: ${configQuery.data.aisaApiKeyHint} (deixe em branco para manter)`
										: "Token Bearer obtido no console da Aisa (api.aisa.one)."
								}
							>
								<TextInput
									type="password"
									autoComplete="off"
									placeholder={
										configQuery.data?.hasAisaApiKey
											? "•••••••••••• (salva)"
											: "sk-aisa-..."
									}
									value={aisaApiKey}
									onChange={(event) => {
										setAisaApiKey(event.target.value);
										setConfigSaved(false);
									}}
								/>
							</Field>

							<Field
								label="URL Base da Aisa"
								hint="Padrão oficial REST: https://api.aisa.one"
							>
								<TextInput
									type="url"
									placeholder="https://api.aisa.one"
									value={aisaBaseUrl}
									onChange={(event) => {
										setAisaBaseUrl(event.target.value);
										setConfigSaved(false);
									}}
								/>
							</Field>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<label className="block">
								<span className="mb-1.5 block text-[12px] font-bold text-ink-strong">
									Provedor de IA
								</span>
								<select
									aria-label="Provedor de IA"
									value={llmProvider}
									onChange={(event) =>
										handleProviderChange(event.target.value as AiLlmProvider)
									}
									className="h-11 w-full rounded-md border border-line-strong bg-canvas px-3 text-[13px] font-semibold text-ink-strong outline-none focus:border-accent-500"
								>
									{AI_LLM_PROVIDER_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</label>

							<Field
								label="Modelo de IA"
								hint="Ex.: gemini-2.5-flash, gpt-4o-mini, claude-sonnet-4-5"
							>
								<TextInput
									placeholder="gpt-4o-mini"
									value={llmModel}
									onChange={(event) => {
										setLlmModel(event.target.value);
										setConfigSaved(false);
									}}
								/>
							</Field>
						</div>

						{llmProvider !== "AISA" ? (
							<div className="grid gap-3 sm:grid-cols-2">
								<Field
									label="Chave / Token do provedor de IA"
									hint={
										configQuery.data?.hasLlmApiKey
											? `Token salvo: ${configQuery.data.llmApiKeyHint} (deixe em branco para manter)`
											: "Credencial do provedor selecionado (Gemini, GPT, Claude ou Custom)."
									}
								>
									<TextInput
										type="password"
										autoComplete="off"
										placeholder={
											configQuery.data?.hasLlmApiKey
												? "•••••••••••• (salvo)"
												: "Cole a API key / token..."
										}
										value={llmApiKey}
										onChange={(event) => {
											setLlmApiKey(event.target.value);
											setConfigSaved(false);
										}}
									/>
								</Field>

								{llmProvider === "CUSTOM" ? (
									<Field
										label="URL do endpoint customizado"
										hint="Compatível com /v1/chat/completions (ex.: OpenRouter, Groq, Ollama)."
									>
										<TextInput
											type="url"
											required
											placeholder="https://seu-endpoint.com/v1/chat/completions"
											value={llmBaseUrl}
											onChange={(event) => {
												setLlmBaseUrl(event.target.value);
												setConfigSaved(false);
											}}
										/>
									</Field>
								) : null}
							</div>
						) : null}

						{saveConfig.isError ? (
							<p
								role="alert"
								className="rounded-md border border-brand-500 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600 dark:text-rose-300"
							>
								{errorText(saveConfig.error)}
							</p>
						) : null}

						{configSaved ? (
							<output className="rounded-md border border-emerald-500 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
								✓ Configurações salvas com segurança no banco de dados.
							</output>
						) : null}

						<div className="flex justify-end">
							<Button
								type="submit"
								variant="primary"
								size="sm"
								disabled={saveConfig.isPending}
							>
								{saveConfig.isPending ? "Salvando…" : "Salvar configurações"}
							</Button>
						</div>
					</form>
				</details>

				{/* Formulário principal de pesquisa na API Aisa */}
				<form
					onSubmit={handleSearch}
					className="grid gap-3.5 rounded-xl border border-line bg-surface p-4"
				>
					<div className="grid gap-3 sm:grid-cols-2">
						<Field
							label="Segmento / Nicho"
							hint="Descreva o tipo de empresa que deseja prospectar."
						>
							<TextInput
								required
								placeholder="Ex.: Energia Solar, Clínicas Odontológicas, Transportadoras"
								value={segment}
								onChange={(event) => setSegment(event.target.value)}
							/>
						</Field>

						<Field
							label="Palavras-chave adicionais"
							hint="Opcional: termos comerciais, produtos ou diferenciais."
						>
							<TextInput
								placeholder="Ex.: B2B, atacado, indústria, integrador"
								value={keywords}
								onChange={(event) => setKeywords(event.target.value)}
							/>
						</Field>
					</div>

					<div className="grid gap-3 sm:grid-cols-4">
						<Field label="Cidade">
							<TextInput
								placeholder="Ex.: Belo Horizonte"
								value={city}
								onChange={(event) => setCity(event.target.value)}
							/>
						</Field>

						<label className="block">
							<span className="mb-1.5 block text-[12px] font-bold text-ink-strong">
								UF
							</span>
							<select
								aria-label="UF da pesquisa"
								value={state}
								onChange={(event) => setState(event.target.value)}
								className="h-11 w-full rounded-md border border-line-strong bg-canvas px-3 text-[13px] font-semibold text-ink-strong outline-none focus:border-accent-500"
							>
								{UF_OPTIONS.map((uf) => (
									<option key={uf.value} value={uf.value}>
										{uf.label}
									</option>
								))}
							</select>
						</label>

						<label className="block">
							<span className="mb-1.5 block text-[12px] font-bold text-ink-strong">
								Porte da empresa
							</span>
							<select
								aria-label="Porte da empresa"
								value={companySize}
								onChange={(event) =>
									setCompanySize(
										event.target.value as "" | "ME" | "EPP" | "DEMAIS",
									)
								}
								className="h-11 w-full rounded-md border border-line-strong bg-canvas px-3 text-[13px] font-semibold text-ink-strong outline-none focus:border-accent-500"
							>
								<option value="">Todos</option>
								<option value="ME">ME</option>
								<option value="EPP">EPP</option>
								<option value="DEMAIS">Demais</option>
							</select>
						</label>

						<label className="block">
							<span className="mb-1.5 block text-[12px] font-bold text-ink-strong">
								Limite de resultados
							</span>
							<select
								aria-label="Limite de resultados"
								value={maxResults}
								onChange={(event) => setMaxResults(Number(event.target.value))}
								className="h-11 w-full rounded-md border border-line-strong bg-canvas px-3 text-[13px] font-semibold text-ink-strong outline-none focus:border-accent-500"
							>
								<option value={5}>5 empresas</option>
								<option value={10}>10 empresas</option>
								<option value={15}>15 empresas</option>
								<option value={20}>20 empresas</option>
							</select>
						</label>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 sm:items-end">
						<label className="block">
							<span className="mb-1.5 block text-[12px] font-bold text-ink-strong">
								Motor de busca Aisa
							</span>
							<select
								aria-label="Motor de busca Aisa"
								value={engine}
								onChange={(event) =>
									setEngine(event.target.value as AisaSearchEngine)
								}
								className="h-11 w-full rounded-md border border-line-strong bg-canvas px-3 text-[13px] font-semibold text-ink-strong outline-none focus:border-accent-500"
							>
								{AISA_ENGINE_OPTIONS.map((item) => (
									<option key={item.value} value={item.value}>
										{item.label}
									</option>
								))}
							</select>
						</label>

						<label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-md border border-line bg-canvas px-3 text-xs font-semibold text-ink">
							<input
								type="checkbox"
								checked={deepExtract}
								onChange={(event) => setDeepExtract(event.target.checked)}
							/>
							<span>
								Extração profunda nas páginas (busca CNPJ, telefone e e-mail)
							</span>
						</label>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
						<span className="text-[11px] text-ink-muted">
							{configured
								? `Pronto: Aisa (${configQuery.data?.llmProvider ?? "AISA"} · ${configQuery.data?.llmModel ?? "gpt-4o-mini"})`
								: "Abra as configurações acima para salvar sua chave da Aisa."}
						</span>
						<Button
							type="submit"
							variant="brand"
							disabled={searchLeads.isPending || !segment.trim()}
						>
							{searchLeads.isPending
								? "Pesquisando na Aisa…"
								: "🔍 Buscar empresas com Aisa"}
						</Button>
					</div>
				</form>

				{searchLeads.isError ? (
					<p
						role="alert"
						className="rounded-md border border-brand-500 bg-brand-50 px-3 py-2.5 text-xs font-semibold text-brand-600 dark:text-rose-300"
					>
						{errorText(searchLeads.error)}
					</p>
				) : null}

				{searchLeads.data?.warnings.length ? (
					<div className="rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
						{searchLeads.data.warnings.map((warning) => (
							<p key={warning}>⚠️ {warning}</p>
						))}
					</div>
				) : null}

				{importLeads.isError ? (
					<p
						role="alert"
						className="rounded-md border border-brand-500 bg-brand-50 px-3 py-2.5 text-xs font-semibold text-brand-600 dark:text-rose-300"
					>
						{errorText(importLeads.error)}
					</p>
				) : null}

				{importFeedback ? (
					<output className="rounded-md border border-emerald-500 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
						✓ {importFeedback}
					</output>
				) : null}

				{/* Resultados */}
				{searchLeads.data ? (
					<div className="grid gap-3">
						<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-3.5 py-2.5">
							<div className="flex flex-wrap items-center gap-2 text-xs">
								<strong className="text-ink-strong">
									{results.length} empresa(s) encontrada(s)
								</strong>
								<Badge tone="info">Motor: {searchLeads.data.engineUsed}</Badge>
								<Badge tone="accent">
									{searchLeads.data.llmUsed
										? `IA: ${searchLeads.data.llmProvider}`
										: "Extração automática"}
								</Badge>
							</div>

							{results.length > 0 ? (
								<div className="flex flex-wrap items-center gap-2">
									<label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-ink">
										<input
											type="checkbox"
											checked={allSelected}
											onChange={(event) =>
												toggleSelectAll(event.target.checked)
											}
										/>
										<span>Selecionar todos</span>
									</label>
									<input
										type="text"
										aria-label="Categoria interna para importação"
										placeholder="Categoria interna"
										value={importSector}
										onChange={(event) => setImportSector(event.target.value)}
										className="h-9 w-40 rounded-md border border-line-strong bg-surface px-2.5 text-xs text-ink-strong"
									/>
									<Button
										variant="success"
										size="sm"
										disabled={selectedKeys.size === 0 || importLeads.isPending}
										onClick={() => void handleImport(Array.from(selectedKeys))}
									>
										{importLeads.isPending
											? "Importando…"
											: `Importar selecionados (${selectedKeys.size})`}
									</Button>
								</div>
							) : null}
						</div>

						{results.length === 0 ? (
							<p className="rounded-lg border border-line bg-canvas px-4 py-6 text-center text-xs text-ink-muted">
								Nenhuma empresa encontrada para esses filtros. Tente ampliar o
								segmento, cidade ou trocar o motor da Aisa.
							</p>
						) : (
							<ul className="grid gap-2.5">
								{results.map((lead, idx) => {
									const key = candidateKey(lead, idx);
									const isImported = importedKeys.has(key);
									const isChecked = selectedKeys.has(key);

									return (
										<li
											key={key}
											className="rounded-xl border border-line bg-surface p-3.5 shadow-xs"
										>
											<div className="flex flex-wrap items-start justify-between gap-3">
												<label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
													<input
														type="checkbox"
														disabled={isImported}
														checked={isChecked}
														onChange={() => toggleSelect(key)}
														className="mt-1"
													/>
													<div className="min-w-0">
														<div className="flex flex-wrap items-center gap-2">
															<span className="text-sm font-bold text-ink-strong">
																{lead.companyName}
															</span>
															<Badge tone={TEMPERATURE_TONE[lead.temperature]}>
																{lead.temperature}
																{lead.fitScore !== null
																	? ` · ${lead.fitScore}`
																	: ""}
															</Badge>
															{lead.companySize ? (
																<Badge tone="neutral">{lead.companySize}</Badge>
															) : null}
														</div>
														<p className="mt-0.5 text-[11px] text-ink-muted">
															{[
																lead.city && lead.state
																	? `${lead.city}/${lead.state}`
																	: (lead.city ?? lead.state),
																lead.customSector,
																lead.website,
															]
																.filter(Boolean)
																.join(" • ")}
														</p>
														{lead.summary ? (
															<p className="mt-1.5 text-xs text-ink leading-relaxed">
																{lead.summary}
															</p>
														) : null}
														{lead.contact ? (
															<p className="mt-1 text-[11px] font-semibold text-ink-strong">
																👤{" "}
																{[
																	lead.contact.name,
																	lead.contact.role,
																	lead.contact.phone,
																	lead.contact.email,
																]
																	.filter(Boolean)
																	.join(" · ")}
															</p>
														) : null}
													</div>
												</label>

												<div className="flex shrink-0 items-center gap-2">
													<input
														type="text"
														aria-label={`CNPJ de ${lead.companyName}`}
														placeholder="CNPJ opcional"
														maxLength={18}
														disabled={isImported}
														value={editedCnpjs[key] ?? ""}
														onChange={(event) =>
															setEditedCnpjs((current) => ({
																...current,
																[key]: maskCnpj(event.target.value),
															}))
														}
														className="h-9 w-40 rounded-md border border-line-strong bg-canvas px-2.5 text-xs text-ink-strong"
													/>
													<Button
														size="sm"
														variant={isImported ? "outline" : "primary"}
														disabled={isImported || importLeads.isPending}
														onClick={() => void handleImport([key])}
													>
														{isImported ? "✓ No Pool" : "Importar"}
													</Button>
												</div>
											</div>
										</li>
									);
								})}
							</ul>
						)}
					</div>
				) : null}
			</div>
		</Dialog>
	);
}
