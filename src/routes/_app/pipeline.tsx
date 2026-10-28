import {
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";
import { Fragment, useMemo, useState } from "react";
import { z } from "zod";
import { PageHeader } from "#/components/layout/PageHeader";
import { Badge } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Card } from "#/components/ui/Card";
import type { TableColumn } from "#/components/ui/DataTable";
import { Dialog } from "#/components/ui/Dialog";
import { Field, TextInput } from "#/components/ui/Field";
import { LeadDrawer } from "#/features/leads/LeadDrawer";
import {
	errorMessage,
	isVersionConflict,
	type PipelineCard,
	type PipelineFilters,
	type PipelineStage,
	type PipelineStageGroup,
	useMarkLeadLost,
	useMoveLeadStage,
	usePipeline,
	useSaveCommercialTerms,
} from "#/features/pipeline/api";
import {
	alvoDoCard,
	cardCompanyName,
	cardLocation,
	formatCurrency,
	type LeadTarget,
	MOTIVOS_PERDA,
	stageTheme,
	type TermosComerciais,
	toDateInput,
} from "#/features/pipeline/data";
import { getSession, useSession } from "#/lib/session";

const pipelineSearchSchema = z.object({
	view: z.enum(["kanban", "lista"]).catch("kanban"),
});

export const Route = createFileRoute("/_app/pipeline")({
	validateSearch: pipelineSearchSchema,
	beforeLoad: async ({ search }) => {
		const role = (await getSession())?.operationalRole;
		if (role === "CAPTADOR") {
			throw redirect({ to: "/dashboard" });
		}
		if (role === "ADMIN" && search.view !== "lista") {
			throw redirect({ to: "/pipeline", search: { view: "lista" } });
		}
	},
	component: PipelinePage,
});

function KanbanColumn({
	group,
	children,
}: {
	group: PipelineStageGroup;
	children: ReactNode;
}) {
	const { isOver, setNodeRef } = useDroppable({ id: group.stage.id });
	const theme = stageTheme(group.stage.code);

	return (
		<section ref={setNodeRef} className="flex w-[280px] shrink-0 flex-col">
			<header
				className={`flex items-center justify-between rounded-t-xl px-3.5 py-3 ${theme.bg}`}
			>
				<div>
					<h2
						className={`text-[12px] font-black tracking-wider uppercase ${theme.text}`}
					>
						{group.stage.name}
					</h2>
					<p className="mt-0.5 text-[10px] font-medium text-ink-muted">
						{group.count} {group.count === 1 ? "lead" : "leads"} •{" "}
						{formatCurrency(group.total_value)}
					</p>
				</div>
				<span
					className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${theme.badge}`}
				>
					{group.count}
				</span>
			</header>
			<div
				className={`flex min-h-64 flex-1 flex-col gap-2.5 rounded-b-xl border-x border-b border-line p-2.5 transition-colors ${
					isOver ? "bg-accent-50/60" : "bg-slate-50/80"
				}`}
			>
				{children}
			</div>
		</section>
	);
}

function KanbanCard({
	card,
	stages,
	onSelect,
	onMove,
}: {
	card: PipelineCard;
	stages: PipelineStage[];
	onSelect: (cardId: string) => void;
	onMove: (card: PipelineCard, stageId: string) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, isDragging } =
		useDraggable({ id: card.id });
	const style: CSSProperties = transform
		? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
		: {};
	const company = cardCompanyName(card);

	return (
		<div ref={setNodeRef} style={style} {...listeners} {...attributes}>
			<Card
				className={`p-3.5 shadow-xs transition-all hover:shadow-sm ${
					card.has_alert
						? "border-rose-300 bg-rose-50/20"
						: "border-line bg-surface"
				} ${isDragging ? "opacity-50 ring-2 ring-accent-500" : ""}`}
			>
				<button
					type="button"
					onClick={() => onSelect(card.id)}
					aria-label={`Abrir ${company}`}
					className="w-full touch-none text-left focus-visible:outline-2 focus-visible:outline-accent-500"
				>
					<p className="text-[13px] font-bold leading-tight text-ink-strong">
						{company}
					</p>
					<p className="mt-1 text-[11px] text-ink-muted">
						{cardLocation(card)}
					</p>
					<p className="mt-2 text-[14px] font-black text-emerald-600">
						{formatCurrency(card.ticket_value)}
					</p>

					{card.has_alert ? (
						<span className="mt-2.5 inline-flex items-center gap-1 rounded-sm border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
							🚨 Alerta de inatividade
						</span>
					) : null}

					<div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-ink-muted">
						<span className="flex min-w-0 items-center gap-1 font-medium">
							<span>👤</span>
							<span className="truncate">
								{card.assigned_user?.name ?? "Sem vendedor"}
							</span>
						</span>
					</div>
				</button>

				<label className="mt-2 block">
					<span className="sr-only">Mover {company} para outra etapa</span>
					<select
						aria-label={`Mover ${company} para outra etapa`}
						value=""
						onPointerDown={(event) => event.stopPropagation()}
						onChange={(event) => {
							if (event.target.value) onMove(card, event.target.value);
						}}
						className="h-8 w-full rounded-md border border-line-strong bg-canvas px-2 text-[11px] font-semibold text-ink"
					>
						<option value="">Mover para…</option>
						{stages
							.filter((stage) => stage.id !== card.stage_id)
							.map((stage) => (
								<option key={stage.id} value={stage.id}>
									{stage.name}
								</option>
							))}
					</select>
				</label>
			</Card>
		</div>
	);
}

function PipelinePage() {
	const session = useSession();
	const { view } = Route.useSearch();
	const navigate = useNavigate();
	const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
	const [sellerFilter, setSellerFilter] = useState("all");
	const [cityFilter, setCityFilter] = useState("todas");
	const [minimumTicket, setMinimumTicket] = useState("");
	const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(
		{},
	);
	const [notice, setNotice] = useState("");
	const [warning, setWarning] = useState("");
	const [termsTarget, setTermsTarget] = useState<TermosComerciais | null>(null);
	const [ticket, setTicket] = useState("");
	const [probability, setProbability] = useState("");
	const [forecast, setForecast] = useState("");
	const [scope, setScope] = useState("");
	const [lostTarget, setLostTarget] = useState<LeadTarget | null>(null);
	const [lostReason, setLostReason] = useState("");
	const [lostNotes, setLostNotes] = useState("");
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor),
	);

	const filters = useMemo<PipelineFilters>(
		() => ({
			assigned_user_id: sellerFilter === "all" ? undefined : sellerFilter,
			ticket_min: minimumTicket ? Number(minimumTicket) : undefined,
		}),
		[sellerFilter, minimumTicket],
	);
	const pipeline = usePipeline(filters);
	const moveStage = useMoveLeadStage();
	const saveTerms = useSaveCommercialTerms();
	const markLost = useMarkLeadLost();

	const groups = pipeline.data?.stages ?? [];
	const stages = groups.map((group) => group.stage);
	const stageById = new Map(stages.map((stage) => [stage.id, stage]));
	const allCards = groups.flatMap((group) => group.cards);
	const sellers = Array.from(
		new Map(
			allCards
				.filter((card) => card.assigned_user)
				.map((card) => [card.assigned_user?.id, card.assigned_user?.name]),
		).entries(),
	);
	const cities = Array.from(
		new Set(
			allCards
				.map((card) => card.lead.city)
				.filter((city): city is string => Boolean(city)),
		),
	).sort();

	const visibleGroups = groups.map((group) => {
		const cards =
			cityFilter === "todas"
				? group.cards
				: group.cards.filter((card) => card.lead.city === cityFilter);

		return {
			...group,
			cards,
			count: cards.length,
			total_value: cards.reduce(
				(total, card) => total + (card.ticket_value ?? 0),
				0,
			),
		};
	});

	function clearFeedback() {
		setNotice("");
		setWarning("");
	}

	function moveCard(card: PipelineCard, stageId: string) {
		const stage = stageById.get(stageId);
		if (!stage || card.stage_id === stageId) return;
		clearFeedback();

		if (stage.is_lost_stage) {
			setLostTarget(alvoDoCard(card));
			setLostReason("");
			setLostNotes("");
			return;
		}

		moveStage.mutate(
			{ id: card.id, stageId, version: card.version },
			{
				onSuccess: () => setNotice(`Oportunidade movida para ${stage.name}.`),
				onError: (error) => {
					setWarning(
						isVersionConflict(error)
							? "Outra pessoa alterou esta oportunidade. O funil foi recarregado — confira a etapa atual."
							: errorMessage(error),
					);
				},
			},
		);
	}

	function handleDragEnd(event: DragEndEvent) {
		if (!event.over) return;
		const card = allCards.find((item) => item.id === String(event.active.id));
		if (!card) return;
		moveCard(card, String(event.over.id));
	}

	function openTerms(target: TermosComerciais) {
		clearFeedback();
		setTermsTarget(target);
		setTicket(target.ticketValue === null ? "" : String(target.ticketValue));
		setProbability(
			target.closeProbability === null ? "" : String(target.closeProbability),
		);
		setForecast(toDateInput(target.expectedCloseDate));
		setScope(target.proposalScope ?? "");
	}

	function saveTermsForm(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!termsTarget) return;
		clearFeedback();
		setWarning("");

		saveTerms.mutate(
			{
				id: termsTarget.id,
				ticket_value: ticket === "" ? undefined : Number(ticket),
				close_probability: probability === "" ? undefined : Number(probability),
				expected_close_date: forecast || undefined,
				proposal_scope: scope.trim() || undefined,
			},
			{
				onSuccess: () => {
					setTermsTarget(null);
					setNotice("Valor da oportunidade atualizado.");
				},
				onError: (error) => setWarning(errorMessage(error)),
			},
		);
	}

	function saveLoss(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!lostTarget || !lostReason) return;
		clearFeedback();

		markLost.mutate(
			{
				id: lostTarget.id,
				lossReasonCode: lostReason,
				lossReasonNotes: lostNotes.trim() || undefined,
			},
			{
				onSuccess: () => {
					setNotice("Lead marcado como perdido com o motivo registrado.");
					setLostTarget(null);
					setLostReason("");
					setLostNotes("");
				},
				onError: (error) => setWarning(errorMessage(error)),
			},
		);
	}

	const irPara = (proxima: "kanban" | "lista") => {
		void navigate({ to: "/pipeline", search: { view: proxima } });
	};

	const colunas: TableColumn<PipelineCard>[] = [
		{
			key: "cliente",
			header: "Cliente",
			render: (card) => (
				<div>
					<p className="text-[13px] font-bold text-ink-strong">
						{cardCompanyName(card)}
					</p>
					<p className="mt-0.5 text-[11px] text-ink-muted">
						{card.lead.cnpj ?? "Sem CNPJ"}
					</p>
				</div>
			),
		},
		{
			key: "local",
			header: "Localização",
			render: (card) => (
				<span className="text-[12px] text-ink">{cardLocation(card)}</span>
			),
		},
		{
			key: "ticket",
			header: "Ticket R$",
			render: (card) => (
				<span className="text-[13px] font-bold text-success-600">
					{formatCurrency(card.ticket_value)}
				</span>
			),
		},
		{
			key: "etapa",
			header: "Etapa",
			render: (card) => (
				<Badge tone="accent">
					{stageById.get(card.stage_id)?.name ?? card.stage_id}
				</Badge>
			),
		},
		{
			key: "vendedor",
			header: "Vendedor",
			render: (card) => (
				<span className="text-[12px] text-ink">
					{card.assigned_user?.name ?? "Sem vendedor"}
				</span>
			),
		},
	];

	const columnsWithOpen: TableColumn<PipelineCard>[] = [
		...colunas,
		{
			key: "abrir",
			header: "Ficha",
			render: (card) => (
				<Button
					size="sm"
					variant="outline"
					onClick={() => setSelectedLeadId(card.id)}
				>
					Abrir ficha
				</Button>
			),
		},
	];

	return (
		<>
			<PageHeader
				eyebrow="📊 OPERAÇÃO COMERCIAL"
				title={
					view === "kanban"
						? "Meu Funil de Vendas (7 Etapas Tradicionais • Kanban Completo)"
						: "Lista Geral de Leads por Etapa + Fila Sem Vendedor"
				}
				actions={
					<div className="flex flex-wrap items-center gap-3">
						{session.operationalRole === "ADMIN" ? (
							<Badge tone="neutral">Visão da equipe · Lista</Badge>
						) : (
							<div className="flex overflow-hidden rounded-md border border-line bg-surface p-0.5 shadow-xs">
								<button
									type="button"
									className={`rounded-sm px-3 py-1.5 text-xs font-bold transition-colors ${
										view === "kanban"
											? "bg-brand-500 text-white shadow-xs"
											: "text-ink hover:text-ink-strong"
									}`}
									onClick={() => irPara("kanban")}
								>
									⊞ Kanban
								</button>
								<button
									type="button"
									className={`rounded-sm px-3 py-1.5 text-xs font-bold transition-colors ${
										view === "lista"
											? "bg-brand-500 text-white shadow-xs"
											: "text-ink hover:text-ink-strong"
									}`}
									onClick={() => irPara("lista")}
								>
									☰ Lista
								</button>
							</div>
						)}
						<Button
							variant="brand"
							size="sm"
							className="font-bold shadow-xs"
							onClick={() =>
								setNotice(
									"O cadastro manual de oportunidades fica no Pool de Leads.",
								)
							}
						>
							+ Novo Lead Manual
						</Button>
					</div>
				}
			/>

			{pipeline.data ? (
				<div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">
					<Badge tone="accent">
						{pipeline.data.totals.count} oportunidades
					</Badge>
					<span className="font-bold text-ink-strong">
						{formatCurrency(pipeline.data.totals.total_value)}
					</span>
					{pipeline.isFetching ? <span>Atualizando…</span> : null}
				</div>
			) : null}

			{notice ? (
				<output className="mb-4 block rounded-md border border-success-500 bg-success-50 px-4 py-3 text-sm text-success-600">
					{notice}
				</output>
			) : null}

			{warning ? (
				<output
					role="alert"
					className="mb-4 block rounded-md border border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-600"
				>
					{warning}
				</output>
			) : null}

			{pipeline.isPending ? (
				<p className="py-10 text-center text-sm text-ink-muted">
					Carregando funil de vendas…
				</p>
			) : null}

			{pipeline.isError ? (
				<div
					role="alert"
					className="grid justify-items-start gap-3 rounded-md border border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-600"
				>
					<p>{errorMessage(pipeline.error)}</p>
					<Button
						size="sm"
						variant="outline"
						onClick={() => pipeline.refetch()}
					>
						Tentar novamente
					</Button>
				</div>
			) : null}

			{pipeline.isSuccess && view === "kanban" ? (
				<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
					<div className="flex gap-3 overflow-x-auto pb-4">
						{visibleGroups.map((group) => (
							<KanbanColumn key={group.stage.id} group={group}>
								{group.cards.map((card) => (
									<KanbanCard
										key={card.id}
										card={card}
										stages={stages}
										onSelect={setSelectedLeadId}
										onMove={moveCard}
									/>
								))}
								{group.cards.length === 0 ? (
									<p className="rounded-md border border-dashed border-line-strong p-4 text-center text-xs text-ink-muted">
										Sem oportunidades nesta etapa.
									</p>
								) : null}
							</KanbanColumn>
						))}
					</div>
				</DndContext>
			) : null}

			{pipeline.isSuccess && view === "lista" ? (
				<Card className="overflow-hidden p-0">
					{session.operationalRole === "ADMIN" ? (
						<div className="grid gap-3 border-b border-line bg-surface p-4 sm:grid-cols-2 xl:grid-cols-3">
							<label className="grid gap-1 text-xs font-semibold text-ink-strong">
								Vendedor responsável
								<select
									aria-label="Filtrar por vendedor"
									value={sellerFilter}
									onChange={(event) => setSellerFilter(event.target.value)}
									className="h-10 rounded-md border border-line-strong bg-canvas px-3"
								>
									<option value="all">Todos</option>
									<option value="me">Meus leads</option>
									{sellers.map(([id, name]) => (
										<option key={id} value={id}>
											{name}
										</option>
									))}
								</select>
							</label>
							<label className="grid gap-1 text-xs font-semibold text-ink-strong">
								Cidade
								<select
									aria-label="Filtrar por cidade"
									value={cityFilter}
									onChange={(event) => setCityFilter(event.target.value)}
									className="h-10 rounded-md border border-line-strong bg-canvas px-3"
								>
									<option value="todas">Todas</option>
									{cities.map((city) => (
										<option key={city} value={city}>
											{city}
										</option>
									))}
								</select>
							</label>
							<Field label="Ticket mínimo (R$)">
								<TextInput
									aria-label="Ticket mínimo (R$)"
									type="number"
									min="0"
									value={minimumTicket}
									onChange={(event) => setMinimumTicket(event.target.value)}
									placeholder="Qualquer valor"
								/>
							</Field>
						</div>
					) : null}
					<div className="overflow-x-auto">
						<table className="w-full min-w-[760px] border-collapse text-left">
							<thead>
								<tr className="border-b border-line bg-canvas">
									{columnsWithOpen.map((column) => (
										<th
											key={column.key}
											className="px-4 py-3 text-[11px] font-bold tracking-wide text-ink-muted uppercase"
										>
											{column.header}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{visibleGroups.map((group) => {
									const expanded = expandedStages[group.stage.id] ?? true;
									return (
										<Fragment key={group.stage.id}>
											<tr className="bg-ink-soft">
												<th
													scope="rowgroup"
													colSpan={columnsWithOpen.length}
													className="px-4 py-2 text-left"
												>
													<button
														type="button"
														aria-expanded={expanded}
														onClick={() =>
															setExpandedStages((current) => ({
																...current,
																[group.stage.id]: !expanded,
															}))
														}
														className="flex w-full items-center justify-between gap-3 text-xs font-bold text-ink-strong"
													>
														<span>
															{expanded ? "▾" : "▸"} {group.stage.name} (
															{group.count} Leads •{" "}
															{formatCurrency(group.total_value)})
														</span>
													</button>
												</th>
											</tr>
											{expanded
												? group.cards.map((card) => (
														<tr
															key={card.id}
															className="border-b border-line last:border-b-0 hover:bg-canvas/60"
														>
															{columnsWithOpen.map((column) => (
																<td
																	key={column.key}
																	className="px-4 py-3 align-middle"
																>
																	{column.render(card)}
																</td>
															))}
														</tr>
													))
												: null}
										</Fragment>
									);
								})}
							</tbody>
						</table>
					</div>
				</Card>
			) : null}

			<LeadDrawer
				leadId={selectedLeadId}
				onClose={() => setSelectedLeadId(null)}
				onEditTerms={openTerms}
				onMarkLost={(target) => {
					clearFeedback();
					setLostTarget(target);
					setLostReason("");
					setLostNotes("");
				}}
				onUnlinked={(companyName) => {
					setNotice(`${companyName} foi devolvido ao pool de leads.`);
					setSelectedLeadId(null);
				}}
			/>

			<Dialog
				open={Boolean(termsTarget)}
				title="Editar termos comerciais"
				description={termsTarget?.companyName}
				onClose={() => setTermsTarget(null)}
			>
				<form onSubmit={saveTermsForm} className="grid gap-4">
					<Field label="Ticket estimado (R$)">
						<TextInput
							type="number"
							min="0"
							step="0.01"
							value={ticket}
							onChange={(event) => setTicket(event.target.value)}
						/>
					</Field>
					<Field
						label="Probabilidade de fechamento (%)"
						hint="Aceita valores de 0 a 100."
					>
						<TextInput
							type="number"
							min="0"
							max="100"
							value={probability}
							onChange={(event) => setProbability(event.target.value)}
						/>
					</Field>
					<Field
						label="Previsão de fechamento"
						hint="A data não pode estar no passado."
					>
						<TextInput
							type="date"
							value={forecast}
							onChange={(event) => setForecast(event.target.value)}
						/>
					</Field>
					<Field label="Escopo da proposta">
						<TextInput
							value={scope}
							onChange={(event) => setScope(event.target.value)}
							placeholder="Ex.: implantação + treinamento"
						/>
					</Field>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => setTermsTarget(null)}>
							Cancelar
						</Button>
						<Button type="submit" disabled={saveTerms.isPending}>
							Salvar valor
						</Button>
					</div>
				</form>
			</Dialog>

			<Dialog
				open={Boolean(lostTarget)}
				title="Registrar motivo da perda"
				description={lostTarget?.companyName}
				onClose={() => {
					setLostTarget(null);
					setLostReason("");
					setLostNotes("");
				}}
			>
				<form onSubmit={saveLoss} className="grid gap-4">
					<p className="text-sm text-ink-muted">
						Selecione o motivo antes de encerrar esta oportunidade.
					</p>
					<label className="grid gap-1.5 text-xs font-bold text-ink-strong">
						Motivo da perda
						<select
							required
							value={lostReason}
							onChange={(event) => setLostReason(event.target.value)}
							className="h-11 rounded-md border border-line-strong bg-canvas px-3 text-sm"
						>
							<option value="">Selecione um motivo</option>
							{MOTIVOS_PERDA.map((motivo) => (
								<option key={motivo.code} value={motivo.code}>
									{motivo.label}
								</option>
							))}
						</select>
					</label>
					<Field label="Observações (opcional)">
						<TextInput
							value={lostNotes}
							onChange={(event) => setLostNotes(event.target.value)}
							placeholder="O que pesou na decisão do cliente?"
						/>
					</Field>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => setLostTarget(null)}>
							Cancelar
						</Button>
						<Button
							type="submit"
							variant="info"
							disabled={!lostReason || markLost.isPending}
						>
							Confirmar perda
						</Button>
					</div>
				</form>
			</Dialog>
		</>
	);
}
