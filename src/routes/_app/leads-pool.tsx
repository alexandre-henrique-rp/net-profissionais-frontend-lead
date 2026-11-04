import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PageHeader } from "#/components/layout/PageHeader";
import { Badge, type BadgeTone } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Card } from "#/components/ui/Card";
import { DataTable, type TableColumn } from "#/components/ui/DataTable";
import { Dialog } from "#/components/ui/Dialog";
import { LeadFormDialog } from "#/features/leads/LeadFormDialog";
import {
	useActiveSellers,
	useCaptadorPipeline,
	useClaimLead,
	usePoolLeads,
} from "#/features/leads-pool/api";
import {
	birthdayLabel,
	type CapturedLead,
	COMPANY_SIZE_OPTIONS,
	contactLabel,
	DEFAULT_POOL_FILTERS,
	documentLabel,
	formatTicket,
	type PoolFilters,
	type PoolLeadItem,
	SECTOR_OPTIONS,
	sectorLabel,
	TEMPERATURE_OPTIONS,
	UF_OPTIONS,
} from "#/features/leads-pool/data";
import { ApiError } from "#/lib/api";
import { firstNonBlankText } from "#/lib/display";
import { type OperationalRole, useSession } from "#/lib/session";

const leadsPoolSearchSchema = z.object({
	novo: z.coerce.string().optional(),
});

export const Route = createFileRoute("/_app/leads-pool")({
	validateSearch: leadsPoolSearchSchema,
	component: LeadsPoolPage,
});

const TEMPERATURE_TONE: Record<string, BadgeTone> = {
	QUENTE: "warning",
	MORNO: "info",
	FRIO: "neutral",
};

function companyNameOf(lead: PoolLeadItem): string {
	return (
		firstNonBlankText(lead.lead.companyName, lead.lead.tradeName) ??
		"Empresa sem nome"
	);
}

function poolColumns(
	role: OperationalRole,
	onAssume: (lead: PoolLeadItem) => void,
	onAssign: (lead: PoolLeadItem) => void,
): TableColumn<PoolLeadItem>[] {
	return [
		{
			key: "cliente",
			header: "Cliente / Empresa / CNPJ (Receita)",
			render: (lead) => (
				<div>
					<p className="text-[13px] font-bold text-ink-strong">
						{companyNameOf(lead)}
					</p>
					<p className="mt-0.5 text-[11px] text-ink-muted">
						{documentLabel(lead.lead)}
					</p>
					{lead.lead.city ? (
						<p className="mt-0.5 text-[11px] text-ink-subtle">
							{lead.lead.city}
							{lead.lead.state ? ` / ${lead.lead.state}` : ""}
						</p>
					) : null}
				</div>
			),
		},
		{
			key: "contato",
			header: "Contato / Datas Especiais",
			render: (lead) => {
				const aniversario = birthdayLabel(lead);

				return (
					<div className="flex flex-col items-start gap-1.5">
						<p className="text-[12px] font-bold text-ink-strong">
							{contactLabel(lead)}
						</p>
						{aniversario ? <Badge tone="warning">{aniversario}</Badge> : null}
					</div>
				);
			},
		},
		{
			key: "setor",
			header: "Setor / Segmento",
			render: (lead) => (
				<div className="flex flex-col items-start gap-1.5">
					<Badge tone="violet">{sectorLabel(lead.lead.sector)}</Badge>
					{lead.customSector ? (
						<Badge tone="neutral">{lead.customSector}</Badge>
					) : null}
					{lead.lead.temperature ? (
						<Badge tone={TEMPERATURE_TONE[lead.lead.temperature] ?? "neutral"}>
							{lead.lead.temperature === "QUENTE"
								? "🔥 Quente"
								: lead.lead.temperature === "MORNO"
									? "🌤️ Morno"
									: "❄️ Frio"}
						</Badge>
					) : null}
				</div>
			),
		},
		{
			key: "ticket",
			header: "Ticket R$",
			render: (lead) => (
				<span className="text-[13px] font-bold text-success-600">
					{formatTicket(lead.ticketValue)}
				</span>
			),
		},
		{
			key: "acoes",
			header: "Ações",
			render: (lead) => (
				<Button
					size="md"
					variant={role === "ADMIN" ? "info" : "success"}
					className={
						role === "ADMIN"
							? "bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-xs"
							: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
					}
					onClick={() => (role === "ADMIN" ? onAssign(lead) : onAssume(lead))}
				>
					{role === "ADMIN" ? "👤 Atribuir Vendedor" : "Assumir Lead ➔"}
				</Button>
			),
		},
	];
}

const CAPTURE_COLUMNS: TableColumn<CapturedLead>[] = [
	{
		key: "cliente",
		header: "Lead captado",
		render: (lead) => (
			<div>
				<p className="text-[13px] font-bold text-ink-strong">
					{lead.companyName}
				</p>
				<p className="mt-0.5 text-[11px] text-ink-muted">{lead.document}</p>
			</div>
		),
	},
	{
		key: "local",
		header: "Localização",
		render: (lead) => (
			<span className="text-[12px] text-ink">
				{lead.city ?? "—"}
				{lead.state ? ` / ${lead.state}` : ""}
			</span>
		),
	},
	{
		key: "vendedor",
		header: "Vendedor responsável",
		render: (lead) =>
			lead.sellerName ? (
				<span className="text-[12px] font-semibold text-ink-strong">
					{lead.sellerName}
				</span>
			) : (
				<Badge tone="warning">Sem vendedor</Badge>
			),
	},
	{
		key: "etapa",
		header: "Etapa atual",
		render: (lead) => <Badge tone="accent">{lead.stageName}</Badge>,
	},
	{
		key: "ticket",
		header: "Ticket R$",
		render: (lead) => (
			<span className="text-[13px] font-bold text-success-600">
				{formatTicket(lead.ticketValue)}
			</span>
		),
	},
];

function messageOf(error: unknown): string {
	if (error instanceof ApiError) {
		return error.message;
	}

	return "Não foi possível concluir a ação. Tente de novo.";
}

function LeadsPoolPage() {
	const session = useSession();
	const navigate = useNavigate();
	const { novo } = Route.useSearch();
	const isCaptor = session.operationalRole === "CAPTADOR";

	const [filters, setFilters] = useState<PoolFilters>(DEFAULT_POOL_FILTERS);
	const [createOpen, setCreateOpen] = useState(false);
	const [assignLead, setAssignLead] = useState<PoolLeadItem | null>(null);
	const [assignee, setAssignee] = useState("");
	const [notice, setNotice] = useState("");
	const [alert, setAlert] = useState("");

	const pool = usePoolLeads(filters);
	const pipeline = useCaptadorPipeline(isCaptor);
	const sellers = useActiveSellers(Boolean(assignLead));
	const claim = useClaimLead();

	useEffect(() => {
		if (novo !== "1" || session.operationalRole !== "CAPTADOR") return;
		setCreateOpen(true);
		void navigate({
			to: "/leads-pool",
			search: (current) => ({ ...current, novo: undefined }),
			replace: true,
		});
	}, [navigate, novo, session.operationalRole]);

	function updateFilters(patch: Partial<PoolFilters>) {
		setFilters((current) => ({ ...current, ...patch, page: 1 }));
	}

	function handleClaimError(error: unknown) {
		if (
			error instanceof ApiError &&
			(error.code === "LEAD_ALREADY_ASSIGNED" || error.status === 409)
		) {
			setAlert("Este lead já foi atribuído a outra pessoa.");
		} else {
			setAlert(messageOf(error));
		}

		setNotice("");
	}

	function assumeLead(lead: PoolLeadItem) {
		setAlert("");
		claim.mutate(
			{ id: lead.id },
			{
				onSuccess: () =>
					setNotice(`${companyNameOf(lead)} foi assumido para o seu funil.`),
				onError: handleClaimError,
			},
		);
	}

	function closeAssignDialog() {
		setAssignLead(null);
		setAssignee("");
	}

	function submitAssign() {
		if (!assignLead || !assignee) return;

		const sellerName =
			sellers.data?.find((seller) => seller.id === assignee)?.name ??
			"vendedor";

		claim.mutate(
			{ id: assignLead.id, assignToUserId: assignee },
			{
				onSuccess: () => {
					setNotice(
						`${companyNameOf(assignLead)} foi atribuído a ${sellerName}.`,
					);
					closeAssignDialog();
				},
				onError: (error) => {
					handleClaimError(error);
					closeAssignDialog();
				},
			},
		);
	}

	const columns = poolColumns(session.operationalRole, assumeLead, (lead) =>
		setAssignLead(lead),
	);

	const poolRows = pool.data?.items ?? [];
	const meta = pool.data?.meta;
	const totalPages = meta
		? Math.max(1, Math.ceil(meta.total / Math.max(1, meta.limit)))
		: 1;
	const captureRows = pipeline.data ?? [];
	const hasActiveFilters =
		filters.q.trim() !== "" ||
		filters.uf !== DEFAULT_POOL_FILTERS.uf ||
		filters.sector !== DEFAULT_POOL_FILTERS.sector ||
		filters.customSector.trim() !== "" ||
		filters.companySize !== DEFAULT_POOL_FILTERS.companySize ||
		filters.temperature !== DEFAULT_POOL_FILTERS.temperature ||
		filters.page > 1;

	return (
		<>
			<PageHeader
				eyebrow="📥 REPOSITÓRIO DE ENTRADA"
				title={
					isCaptor ? "Esteira de Captações" : "Pool de Leads da NetProfissional"
				}
				actions={
					<Button
						variant="brand"
						size="sm"
						className="font-bold shadow-xs"
						onClick={() => setCreateOpen(true)}
					>
						+ Novo Lead (Manual / CNPJ)
					</Button>
				}
			/>

			<div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/60 px-5 py-3 shadow-xs">
				<p className="text-[13px] font-bold text-sky-900">
					{isCaptor
						? `📈 ESTEIRA DE CAPTAÇÕES • ${captureRows.length} captações em acompanhamento`
						: `🎯 REPOSITÓRIO CENTRAL DE ENTRADA • ${meta?.total ?? 0} leads aguardando vendedor responsável`}
				</p>
				<p className="mt-1 text-[11px] text-ink-muted">
					{isCaptor
						? "Acompanhe o vendedor responsável e a etapa atual das oportunidades que você captou."
						: "Leads cadastrados por Captadores ou captados via Webhook de Landing Pages. Atribua a um vendedor ou qualifique antes da distribuição."}
				</p>
			</div>

			{alert ? (
				<p
					role="alert"
					className="mb-4 rounded-md border border-brand-500/40 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-600"
				>
					{alert}
				</p>
			) : null}

			{notice ? (
				<output className="mb-4 block rounded-md border border-success-500 bg-success-50 px-4 py-3 text-sm text-success-600">
					{notice}
				</output>
			) : null}

			<Card>
				{isCaptor ? (
					pipeline.isPending ? (
						<output className="block p-6 text-sm text-ink-muted">
							Carregando captações…
						</output>
					) : pipeline.isError ? (
						<div className="p-6" role="alert">
							<p className="text-sm font-semibold text-brand-600">
								{messageOf(pipeline.error)}
							</p>
							<Button
								variant="outline"
								size="sm"
								className="mt-3"
								onClick={() => void pipeline.refetch()}
							>
								Tentar de novo
							</Button>
						</div>
					) : (
						<DataTable
							columns={CAPTURE_COLUMNS}
							rows={captureRows}
							rowKey={(lead) => lead.id}
							emptyLabel="Você ainda não captou leads. Inclua uma captação para começar."
						/>
					)
				) : (
					<>
						<div className="flex flex-wrap gap-3 border-b border-line p-4">
							<input
								type="search"
								aria-label="Buscar leads"
								placeholder="Buscar nome, documento ou contato"
								value={filters.q}
								onChange={(event) => updateFilters({ q: event.target.value })}
								className="h-10 min-w-[220px] flex-1 rounded-md border border-line-strong bg-canvas px-3 text-sm outline-none focus:border-accent-500"
							/>
							{[
								{
									label: "UF",
									ariaLabel: "Filtrar por UF",
									value: filters.uf,
									options: UF_OPTIONS,
									onChange: (value: string) => updateFilters({ uf: value }),
								},
								{
									label: "Setor",
									ariaLabel: "Filtrar por setor",
									value: filters.sector,
									options: SECTOR_OPTIONS,
									onChange: (value: string) => updateFilters({ sector: value }),
								},
								{
									label: "Porte",
									ariaLabel: "Filtrar por porte",
									value: filters.companySize,
									options: COMPANY_SIZE_OPTIONS,
									onChange: (value: string) =>
										updateFilters({ companySize: value }),
								},
								{
									label: "Temperatura",
									ariaLabel: "Filtrar por temperatura",
									value: filters.temperature,
									options: TEMPERATURE_OPTIONS,
									onChange: (value: string) =>
										updateFilters({ temperature: value }),
								},
							].map((filter) => (
								<label
									key={filter.ariaLabel}
									className="flex items-center gap-2 text-xs font-semibold text-ink"
								>
									{filter.label}
									<select
										aria-label={filter.ariaLabel}
										value={filter.value}
										onChange={(event) => filter.onChange(event.target.value)}
										className="h-10 rounded-md border border-line-strong bg-surface px-3"
									>
										{filter.options.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								</label>
							))}
							<label className="flex items-center gap-2 text-xs font-semibold text-ink">
								Categoria interna
								<input
									type="search"
									aria-label="Filtrar por categoria interna"
									placeholder="Ex.: instaladores"
									value={filters.customSector}
									onChange={(event) =>
										updateFilters({ customSector: event.target.value })
									}
									className="h-10 w-36 rounded-md border border-line-strong bg-surface px-3"
								/>
							</label>
						</div>

						{pool.isPending ? (
							<output className="block p-6 text-sm text-ink-muted">
								Carregando leads…
							</output>
						) : pool.isError ? (
							<div className="p-6" role="alert">
								<p className="text-sm font-semibold text-brand-600">
									{messageOf(pool.error)}
								</p>
								<Button
									variant="outline"
									size="sm"
									className="mt-3"
									onClick={() => void pool.refetch()}
								>
									Tentar de novo
								</Button>
							</div>
						) : (
							<>
								{poolRows.length === 0 ? (
									<div
										aria-live="polite"
										aria-atomic="true"
										className="grid justify-items-center gap-3 px-5 py-10 text-center"
									>
										<p className="text-sm font-semibold text-ink-strong">
											{hasActiveFilters
												? "Nenhum lead corresponde aos filtros atuais."
												: "O Pool de Leads está vazio no momento."}
										</p>
										{hasActiveFilters ? (
											<>
												<p className="max-w-md text-xs text-ink-muted">
													Remova ou ajuste os filtros para consultar outros
													leads.
												</p>
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														setFilters({ ...DEFAULT_POOL_FILTERS })
													}
												>
													Limpar filtros
												</Button>
											</>
										) : (
											<p className="max-w-md text-xs text-ink-muted">
												Novas captações aparecerão aqui. Você também pode
												cadastrar um lead manualmente.
											</p>
										)}
									</div>
								) : (
									<DataTable
										columns={columns}
										rows={poolRows}
										rowKey={(lead) => lead.id}
										emptyLabel="Nenhum lead corresponde aos filtros."
									/>
								)}
								{meta ? (
									<div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4 text-xs font-semibold text-ink-muted">
										<span>
											Página {meta.page} de {totalPages} • {meta.total}{" "}
											{meta.total === 1 ? "lead" : "leads"}
										</span>
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												disabled={meta.page <= 1}
												onClick={() =>
													setFilters((current) => ({
														...current,
														page: Math.max(1, current.page - 1),
													}))
												}
											>
												Anterior
											</Button>
											<Button
												variant="outline"
												size="sm"
												disabled={!meta.has_more}
												onClick={() =>
													setFilters((current) => ({
														...current,
														page: current.page + 1,
													}))
												}
											>
												Próxima
											</Button>
										</div>
									</div>
								) : null}
							</>
						)}
					</>
				)}
			</Card>

			<LeadFormDialog
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				allowSelfAssignment={!isCaptor}
				onCreated={(lead) =>
					setNotice(`${companyNameOf(lead)} foi incluído no Pool de Leads.`)
				}
			/>

			<Dialog
				open={Boolean(assignLead)}
				title="Atribuir lead a vendedor"
				description={assignLead ? companyNameOf(assignLead) : undefined}
				onClose={closeAssignDialog}
			>
				<form
					className="grid gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						submitAssign();
					}}
				>
					<label className="grid gap-1.5 text-xs font-bold text-ink-strong">
						Vendedor responsável
						<select
							required
							value={assignee}
							onChange={(event) => setAssignee(event.target.value)}
							className="h-11 rounded-md border border-line-strong bg-canvas px-3 text-sm"
						>
							<option value="">
								{sellers.isPending
									? "Carregando vendedores…"
									: "Selecione uma pessoa"}
							</option>
							{(sellers.data ?? []).map((seller) => (
								<option key={seller.id} value={seller.id}>
									{seller.name}
								</option>
							))}
						</select>
					</label>
					<p className="text-[11px] text-ink-muted">
						O lead sai do Pool e entra na carteira da pessoa escolhida.
					</p>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={closeAssignDialog}>
							Cancelar
						</Button>
						<Button
							type="submit"
							variant="primary"
							disabled={!assignee || claim.isPending}
							aria-busy={claim.isPending}
						>
							Atribuir lead
						</Button>
					</div>
				</form>
			</Dialog>
		</>
	);
}
