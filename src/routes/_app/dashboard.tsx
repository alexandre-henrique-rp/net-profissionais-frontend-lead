import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { PageHeader } from "#/components/layout/PageHeader";
import { Badge, type BadgeTone } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Card } from "#/components/ui/Card";
import { KpiCard } from "#/components/ui/KpiCard";
import {
	type AdminDashboard,
	type CaptadorDashboard,
	downloadLeads,
	type ExportFormat,
	type FunnelStage,
	type PeriodSelection,
	type SellerDashboard,
	useAdminDashboard,
	useCaptadorDashboard,
	useSellerDashboard,
} from "#/features/dashboard/api";
import {
	barWidth,
	DATE_TYPE_LABELS,
	formatCompactCurrency,
	formatCurrency,
	formatDateTime,
	formatNumber,
	formatPercent,
	initialsOf,
	LEAD_STATUS_LABELS,
} from "#/features/dashboard/data";
import { PeriodFilter } from "#/features/dashboard/PeriodFilter";
import { ApiError } from "#/lib/api";
import { displayText, finiteNumberOr, firstNonBlankText } from "#/lib/display";
import { type OperationalRole, useSession } from "#/lib/session";

export const Route = createFileRoute("/_app/dashboard")({
	component: DashboardPage,
});

/** Período padrão do produto: mês corrente. */
const DEFAULT_PERIOD: PeriodSelection = { period: "this_month" };

const STATUS_TONES: Record<string, BadgeTone> = {
	AVAILABLE: "info",
	CLAIMED: "success",
	RETURNED_TO_POOL: "warning",
	LOST: "brand",
};

function DashboardPage() {
	const session = useSession();

	return <DashboardContent role={session.operationalRole} />;
}

export function DashboardContent({ role }: { role: OperationalRole }) {
	if (role === "CAPTADOR") return <CaptadorDashboardPage />;
	if (role === "VENDEDOR") return <SellerDashboardPage />;

	return <AdminDashboardPage />;
}

function DashboardLoading({ label }: { label: string }) {
	return (
		<Card className="p-8 text-center">
			<output className="block text-sm text-ink-muted">{label}</output>
		</Card>
	);
}

function DashboardError({
	error,
	onRetry,
}: {
	error: unknown;
	onRetry: () => void;
}) {
	const message =
		error instanceof ApiError
			? error.message
			: "Não foi possível carregar os indicadores.";

	return (
		<Card className="p-8">
			<div role="alert" className="mx-auto max-w-md text-center">
				<p className="text-sm font-bold text-brand-600">
					Não foi possível carregar o dashboard
				</p>
				<p className="mt-1 text-xs text-ink-muted">{message}</p>
				<Button size="sm" className="mt-4" onClick={onRetry}>
					Tentar novamente
				</Button>
			</div>
		</Card>
	);
}

function EmptySection({
	children,
	action,
}: {
	children: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div
			aria-live="polite"
			aria-atomic="true"
			className="mt-4 rounded-xl border border-dashed border-line bg-canvas px-4 py-6 text-center text-xs text-ink-muted"
		>
			<p>{children}</p>
			{action ? <div className="mt-3">{action}</div> : null}
		</div>
	);
}

/** Estado do botão de exportação: uma exportação por vez. */
function useLeadsExport(period: PeriodSelection) {
	const [format, setFormat] = useState<ExportFormat | null>(null);
	const [error, setError] = useState("");

	async function run(next: ExportFormat) {
		setFormat(next);
		setError("");

		try {
			await downloadLeads(next, period);
		} catch (failure) {
			setError(
				failure instanceof ApiError
					? failure.message
					: "Não foi possível exportar os leads agora.",
			);
		} finally {
			setFormat(null);
		}
	}

	return { format, error, run };
}

function maxCount(stages: FunnelStage[]): number {
	return Math.max(...stages.map((stage) => finiteNumberOr(stage.count, 0)), 0);
}

function FunnelBar({
	stage,
	maximum,
	total,
}: {
	stage: FunnelStage;
	maximum: number;
	total: number;
}) {
	const share = total > 0 ? (stage.count / total) * 100 : 0;

	return (
		<li className="grid grid-cols-1 gap-1.5 sm:grid-cols-[190px_minmax(0,1fr)_96px] sm:items-center sm:gap-3">
			<span className="text-[12px] font-semibold text-ink">
				{displayText(stage.stage_name, "Etapa sem nome")}
			</span>
			<span className="h-8 min-w-0 overflow-hidden rounded-md bg-ink-soft">
				<span
					className="flex h-full min-w-fit items-center rounded-md px-3 text-[11px] font-bold text-white shadow-xs"
					style={{
						width: `${barWidth(stage.count, maximum)}%`,
						backgroundColor: displayText(stage.color_hex, "#94a3b8"),
					}}
				>
					{formatNumber(stage.count)} leads ({formatPercent(share)})
				</span>
			</span>
			<span className="text-right text-[12px] font-black text-emerald-600">
				{formatCompactCurrency(stage.total_value)}
			</span>
		</li>
	);
}

function AdminDashboardPage() {
	const [period, setPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);
	const { data, isPending, isError, error, refetch } =
		useAdminDashboard(period);
	const exporter = useLeadsExport(period);

	return (
		<>
			<PageHeader
				eyebrow="📈 MONITORAMENTO & BI COMERCIAL"
				title="Dashboard Gerencial de Conversão, Receita & Origem de Leads (Light Mode)"
				actions={
					<>
						<PeriodFilter value={period} onChange={setPeriod} />
						<Button
							variant="brand"
							size="sm"
							className="font-bold shadow-xs"
							disabled={exporter.format !== null}
							onClick={() => void exporter.run("csv")}
						>
							⬇ Exportar CSV
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={exporter.format !== null}
							onClick={() => void exporter.run("pdf")}
						>
							⬇ Baixar PDF
						</Button>
					</>
				}
			/>

			{exporter.error ? (
				<p
					role="alert"
					className="mb-4 rounded-md border border-brand-500 bg-brand-50 px-4 py-2 text-xs text-brand-600"
				>
					{exporter.error}
				</p>
			) : null}

			{isPending ? (
				<DashboardLoading label="Carregando indicadores da corporação…" />
			) : null}
			{isError ? (
				<DashboardError error={error} onRetry={() => void refetch()} />
			) : null}
			{data ? <AdminBody data={data} /> : null}
		</>
	);
}

function AdminBody({ data }: { data: AdminDashboard }) {
	const { kpis, funnel, loss_reasons, sellers } = data;
	const maximum = maxCount(funnel);
	const lossSummary =
		loss_reasons.length > 0
			? loss_reasons
					.map(
						(reason) =>
							`${displayText(reason.label, "Outro motivo")} (${formatPercent(reason.percentage)})`,
					)
					.join(" • ")
			: "Nenhuma perda registrada no período";

	return (
		<>
			<p className="mb-5 text-[12px] text-ink-muted">
				Período analisado: <strong>{data.period.label}</strong> · conversão
				calculada sobre os leads criados no período.
			</p>

			{kpis.total_leads === 0 ? (
				<Card className="mb-4 p-4">
					<div
						aria-live="polite"
						aria-atomic="true"
						className="flex flex-wrap items-center justify-between gap-3"
					>
						<p className="text-xs font-semibold text-ink">
							Nenhum lead foi criado no período selecionado. Ajuste o filtro de
							período para ver os indicadores.
						</p>
						<Link
							to="/leads-pool"
							className="text-xs font-bold text-brand-600 hover:underline"
						>
							Abrir Pool de Leads
						</Link>
					</div>
				</Card>
			) : null}

			<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<KpiCard
					label="VOLUME TOTAL DE LEADS"
					value={`${formatNumber(kpis.total_leads)} leads`}
					delta={{
						value: `${formatPercent(kpis.conversion_rate)} de conversão`,
						tone: "up",
					}}
					hint={`${formatNumber(kpis.leads_in_pool)} no pool • ${formatNumber(kpis.leads_claimed)} em carteira`}
					valueClassName="text-ink-strong"
				/>
				<KpiCard
					label="PIPELINE EM NEGOCIAÇÃO"
					value={formatCurrency(kpis.pipeline_total_value)}
					delta={{
						value: `${formatNumber(kpis.leads_claimed)} leads em carteira`,
						tone: "up",
					}}
					hint={`Ticket médio: ${formatCurrency(kpis.average_ticket)}`}
					valueClassName="text-[#0284c7]"
				/>
				<KpiCard
					label="RECEITA GANHA (FECHADOS)"
					value={formatCurrency(kpis.won_total_value)}
					delta={{
						value: `${formatNumber(kpis.leads_won)} ganhos no período`,
						tone: "up",
					}}
					hint={`${formatNumber(kpis.leads_lost)} leads perdidos no período`}
					valueClassName="text-[#059669]"
				/>
				<KpiCard
					label="ALERTAS DE INATIVIDADE (>48H)"
					value={`${formatNumber(kpis.inactivity_alerts)} leads`}
					delta={
						kpis.inactivity_alerts > 0
							? { value: "⚠️ Sem contato há mais de 48h", tone: "down" }
							: { value: "✅ Nenhum lead parado", tone: "up" }
					}
					hint="Leads em carteira parados"
					valueClassName="text-[#d97706]"
					borderClassName={
						kpis.inactivity_alerts > 0 ? "border-amber-300" : "border-line"
					}
					bgClassName={
						kpis.inactivity_alerts > 0 ? "bg-amber-50/20" : "bg-surface"
					}
				/>
			</section>

			<section className="mt-[18px] grid gap-4 xl:grid-cols-[1.3fr_0.9fr] xl:gap-5">
				<Card className="p-5">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h2 className="text-[15px] font-bold text-ink-strong">
							📊 Taxa de Conversão por Etapa do Funil (Kanban)
						</h2>
						<span className="inline-flex items-center rounded-full border border-emerald-500 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
							Conversão global: {formatPercent(kpis.conversion_rate)}
						</span>
					</div>
					{funnel.length === 0 ? (
						<EmptySection>Nenhuma etapa do funil no período.</EmptySection>
					) : (
						<ul className="mt-4 flex flex-col gap-3">
							{funnel.map((stage) => (
								<FunnelBar
									key={stage.stage_id}
									stage={stage}
									maximum={maximum}
									total={kpis.total_leads}
								/>
							))}
						</ul>
					)}
				</Card>

				<Card className="p-5 pb-[22px]">
					<h2 className="text-[15px] font-bold text-ink-strong">
						🎯 Motivos de Perda
					</h2>
					<p className="mt-0.5 text-[11px] text-ink-muted">
						Participação de cada motivo sobre os {formatNumber(kpis.leads_lost)}{" "}
						leads perdidos no período.
					</p>
					{loss_reasons.length === 0 ? (
						<EmptySection>Nenhuma perda registrada no período.</EmptySection>
					) : (
						<div className="mt-4 grid gap-2.5">
							{loss_reasons.map((reason) => (
								<div
									key={reason.code}
									className="rounded-xl border border-line bg-canvas p-2.5"
								>
									<div className="flex flex-wrap items-center justify-between gap-1 text-xs">
										<strong className="text-ink-strong">{reason.label}</strong>
										<span className="text-[11px] text-ink-muted">
											{formatNumber(reason.count)} leads •{" "}
											<strong className="font-bold text-brand-600">
												{formatPercent(reason.percentage)}
											</strong>
										</span>
									</div>
									<span className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-ink-soft">
										<span
											className="block h-full rounded-full bg-brand-500"
											style={{
												width: `${Math.max(0, Math.min(reason.percentage, 100))}%`,
											}}
										/>
									</span>
								</div>
							))}
						</div>
					)}
				</Card>
			</section>

			<Card className="mt-4 overflow-hidden p-0 shadow-xs">
				<div className="border-b border-brand-50 bg-brand-50 px-4 py-2 text-[11px] font-bold text-brand-600">
					📉 RELATÓRIO EXECUTIVO DE PERDAS COMERCIAIS: {lossSummary}
				</div>
				<div className="px-5 pt-3 pb-5">
					<h2 className="text-[15px] font-bold text-ink-strong">
						🏆 Produtividade dos Colaboradores
					</h2>
					{sellers.length === 0 ? (
						<EmptySection>
							Nenhum vendedor assumiu leads neste período.
						</EmptySection>
					) : (
						<ul className="mt-4 flex flex-col gap-2.5">
							{sellers.map((person) => (
								<li
									key={person.user_id}
									className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-4 py-2.5 transition-colors hover:bg-surface"
								>
									<div className="flex min-w-0 items-center gap-3">
										<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-black text-white shadow-xs">
											{initialsOf(person.name)}
										</span>
										<div className="min-w-0">
											<p className="text-[13px] font-bold text-ink-strong">
												{displayText(person.name, "Colaborador sem nome")}
											</p>
											<p className="mt-0.5 text-[11px] text-ink-muted">
												{formatNumber(person.claimed_count)} leads assumidos •{" "}
												{formatNumber(person.won_count)} ganhos
											</p>
										</div>
									</div>
									<span className="rounded-full border border-emerald-500 bg-emerald-50 px-3.5 py-1 text-[11px] font-bold text-emerald-600">
										{formatCurrency(person.total_value)}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			</Card>
		</>
	);
}

function SellerDashboardPage() {
	const [period, setPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);
	const { data, isPending, isError, error, refetch } =
		useSellerDashboard(period);

	return (
		<>
			<PageHeader
				eyebrow="🎯 ACELERAÇÃO DE FECHAMENTO"
				title="Painel Operacional do Vendedor"
				actions={
					<>
						<PeriodFilter value={period} onChange={setPeriod} />
						<Link
							to="/pipeline"
							search={{ view: "kanban" }}
							className="inline-flex h-9 items-center justify-center rounded-md bg-brand-500 px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-600"
						>
							Ver Meu Kanban ➔
						</Link>
					</>
				}
			/>

			{isPending ? (
				<DashboardLoading label="Carregando a sua carteira…" />
			) : null}
			{isError ? (
				<DashboardError error={error} onRetry={() => void refetch()} />
			) : null}
			{data ? <SellerBody data={data} /> : null}
		</>
	);
}

function SellerBody({ data }: { data: SellerDashboard }) {
	const { kpis, my_funnel, today_tasks, birthdays } = data;
	const maximum = maxCount(my_funnel);

	return (
		<>
			<p className="mb-5 text-[13px] text-ink-muted">
				Sua rotina do período: {formatNumber(kpis.my_leads)} leads na carteira e{" "}
				{formatPercent(kpis.my_conversion_rate)} de conversão.
			</p>

			<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<KpiCard
					label="LEADS SOB SUA GESTÃO"
					value={`${formatNumber(kpis.my_leads)} leads`}
					hint={`${formatNumber(kpis.my_won)} ganhos • ${formatNumber(kpis.my_lost)} perdidos`}
				/>
				<KpiCard
					label="PIPELINE EM ANDAMENTO"
					value={formatCurrency(kpis.my_pipeline_value)}
					hint="Oportunidades abertas atribuídas a você"
					valueClassName="text-[#0284c7]"
				/>
				<KpiCard
					label="VENDAS GANHAS"
					value={formatCurrency(kpis.my_won_value)}
					delta={{
						value: `${formatPercent(kpis.my_conversion_rate)} de conversão`,
						tone: "up",
					}}
					hint="Receita fechada no período"
					valueClassName="text-emerald-600"
					borderClassName="border-emerald-300"
					bgClassName="bg-emerald-50/20"
				/>
				<KpiCard
					label="TAREFAS PARA HOJE"
					value={`${formatNumber(kpis.today_tasks)} de ${formatNumber(kpis.today_tasks_total)}`}
					hint="Pendências e retornos do dia"
					valueClassName="text-[#d97706]"
					borderClassName="border-amber-300"
					bgClassName="bg-amber-50/20"
				/>
			</section>

			<section className="mt-5 grid gap-4 xl:grid-cols-2">
				<Card className="p-5">
					<h2 className="text-[14px] font-bold text-ink-strong">
						Distribuição do seu funil por estágio
					</h2>
					<p className="mt-0.5 text-[11px] text-ink-muted">
						Volume de clientes e valores acumulados em cada etapa:
					</p>
					{kpis.my_leads === 0 || my_funnel.length === 0 ? (
						<EmptySection
							action={
								<Link
									to="/leads-pool"
									className="font-bold text-brand-600 hover:underline"
								>
									Acessar Pool de Leads
								</Link>
							}
						>
							Nenhum lead na sua carteira no período.
						</EmptySection>
					) : (
						<ul className="mt-4 flex flex-col gap-2">
							{my_funnel.map((stage) => (
								<FunnelBar
									key={stage.stage_id}
									stage={stage}
									maximum={maximum}
									total={kpis.my_leads}
								/>
							))}
						</ul>
					)}
				</Card>

				<Card className="border-rose-200 bg-rose-50/20 p-5">
					<h2 className="flex items-center gap-1.5 text-[14px] font-bold text-brand-600">
						<span>🚨</span>
						<span>Tarefas de hoje</span>
					</h2>
					<p className="mt-0.5 text-[11px] text-ink-muted">
						Leads sem contato há mais de 48h ou com previsão de fechamento
						vencida. Não deixe o negócio esfriar!
					</p>
					{today_tasks.length === 0 ? (
						<EmptySection>
							Nenhuma pendência para hoje. Carteira em dia!
						</EmptySection>
					) : (
						<div className="mt-4 grid gap-2.5">
							{today_tasks.map((task) => (
								<div
									key={task.tenant_lead_id}
									className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-surface p-3 shadow-xs"
								>
									<div className="min-w-0">
										<p className="text-[12px] font-bold text-ink-strong">
											{displayText(task.company_name, "Lead sem nome")}
										</p>
										<p className="mt-0.5 text-[11px] font-semibold text-brand-600">
											{task.reason}
										</p>
									</div>
									{task.stage_name ? (
										<Badge tone="accent">{task.stage_name}</Badge>
									) : null}
								</div>
							))}
						</div>
					)}
				</Card>

				<Card className="border-amber-200 p-5 xl:col-span-2">
					<h2 className="flex items-center gap-1.5 text-[14px] font-bold text-amber-700">
						<span>🎂</span>
						<span>Inteligência de Relacionamento: Datas Especiais</span>
					</h2>
					<p className="mt-0.5 text-[11px] text-ink-muted">
						Aniversários de decisores e sócios nos próximos 7 dias — uma
						mensagem na hora certa destrava conversa.
					</p>
					{birthdays.length === 0 ? (
						<EmptySection>
							Nenhuma data especial nos próximos 7 dias.
						</EmptySection>
					) : (
						<div className="mt-4 grid gap-3 md:grid-cols-2">
							{birthdays.map((entry) => (
								<div
									key={`${entry.lead_id}-${entry.date_type}`}
									className={`rounded-xl border p-3.5 ${
										entry.is_today
											? "border-amber-300 bg-amber-50/50"
											: "border-line bg-surface shadow-xs"
									}`}
								>
									<p className="text-[12px] font-bold text-ink-strong">
										{entry.contact_name ?? "Contato"}{" "}
										{firstNonBlankText(entry.company_name)
											? `• ${firstNonBlankText(entry.company_name)}`
											: ""}
									</p>
									<p className="mt-1 text-[11px] font-bold text-amber-700">
										🎂 {entry.day_month} ·{" "}
										{entry.is_today
											? "é hoje!"
											: `em ${formatNumber(entry.days_until)} dias`}
									</p>
									<p className="mt-1 text-[10px] text-ink-muted">
										{DATE_TYPE_LABELS[entry.date_type] ?? entry.date_type}
									</p>
								</div>
							))}
						</div>
					)}
				</Card>
			</section>
		</>
	);
}

function CaptadorDashboardPage() {
	const [period, setPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);
	const { data, isPending, isError, error, refetch } =
		useCaptadorDashboard(period);

	return (
		<>
			<PageHeader
				eyebrow="📈 OPERAÇÃO DE CAPTAÇÃO"
				title="Dashboard de Produtividade do Captador"
				actions={
					<>
						<PeriodFilter value={period} onChange={setPeriod} />
						<Link
							to="/leads-pool"
							search={{ novo: "1" }}
							className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-700"
						>
							+ Cadastrar Lead (API CNPJ)
						</Link>
					</>
				}
			/>

			{isPending ? (
				<DashboardLoading label="Carregando as suas captações…" />
			) : null}
			{isError ? (
				<DashboardError error={error} onRetry={() => void refetch()} />
			) : null}
			{data ? <CaptadorBody data={data} /> : null}
		</>
	);
}

function CaptadorBody({ data }: { data: CaptadorDashboard }) {
	const { kpis, by_status, recent } = data;
	const approachRate =
		kpis.captured_total > 0
			? (kpis.captured_claimed / kpis.captured_total) * 100
			: 0;

	return (
		<>
			<p className="mb-5 text-[13px] text-ink-muted">
				Acompanhe o impacto das suas prospecções: quantos leads você trouxe,
				quantos foram abordados e as vendas geradas.
			</p>

			<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<KpiCard
					label="LEADS CAPTADOS POR VOCÊ"
					value={`${formatNumber(kpis.captured_total)} leads`}
					hint={`${formatCurrency(kpis.captured_total_value)} em ticket somado`}
				/>
				<KpiCard
					label="ABORDADOS PELO VENDEDOR"
					value={`${formatNumber(kpis.captured_claimed)} leads`}
					hint={`🎯 ${formatPercent(approachRate)} de taxa de abordagem`}
					valueClassName="text-[#0284c7]"
				/>
				<KpiCard
					label="VENDAS DAS SUAS CAPTAÇÕES"
					value={`${formatNumber(kpis.captured_won)} ganhos`}
					delta={{
						value: `${formatPercent(kpis.conversion_rate)} de conversão`,
						tone: "up",
					}}
					hint="Negócios fechados no período"
					valueClassName="text-emerald-600"
					borderClassName="border-emerald-300"
					bgClassName="bg-emerald-50/20"
				/>
				<KpiCard
					label="AGUARDANDO NO POOL"
					value={`${formatNumber(kpis.captured_in_pool)} leads`}
					hint="⏳ Sem vendedor atribuído ainda"
					valueClassName="text-[#d97706]"
					borderClassName="border-amber-300"
					bgClassName="bg-amber-50/20"
				/>
			</section>

			<section className="mt-5 grid gap-4 xl:grid-cols-[minmax(280px,0.85fr)_1.55fr]">
				<Card className="p-5">
					<h2 className="text-[14px] font-bold text-ink-strong">
						Status dos seus leads no funil
					</h2>
					<p className="mt-0.5 text-[11px] text-ink-muted">
						Onde estão os leads que você trouxe neste momento:
					</p>
					{kpis.captured_total === 0 || by_status.length === 0 ? (
						<EmptySection
							action={
								<Link
									to="/leads-pool"
									search={{ novo: "1" }}
									className="font-bold text-brand-600 hover:underline"
								>
									Cadastrar primeira captação
								</Link>
							}
						>
							Você ainda não cadastrou leads.
						</EmptySection>
					) : (
						<div className="mt-4 grid gap-2.5">
							{by_status.map((entry) => (
								<div
									key={entry.status}
									className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-xs"
								>
									<Badge tone={STATUS_TONES[entry.status] ?? "neutral"}>
										{LEAD_STATUS_LABELS[entry.status] ?? entry.status}
									</Badge>
									<strong className="font-black text-ink-strong">
										{formatNumber(entry.count)}
									</strong>
								</div>
							))}
						</div>
					)}
				</Card>

				<Card className="p-5">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div>
							<h2 className="text-[14px] font-bold text-ink-strong">
								Captações recentes
							</h2>
							<p className="mt-0.5 text-[11px] text-ink-muted">
								Os últimos leads cadastrados por você:
							</p>
						</div>
						<Link
							to="/leads-pool"
							className="text-xs font-bold text-brand-500 hover:underline"
						>
							Ver leads →
						</Link>
					</div>
					{recent.length === 0 ? (
						<EmptySection>
							Nenhuma captação registrada. Cadastre um lead para começar.
						</EmptySection>
					) : (
						<ul className="mt-4 divide-y divide-line">
							{recent.map((capture) => (
								<li
									key={capture.tenant_lead_id}
									className="flex flex-wrap items-center justify-between gap-2 py-2.5"
								>
									<div className="min-w-0">
										<p className="text-[12px] font-bold text-ink-strong">
											{displayText(capture.company_name, "Lead sem nome")}
										</p>
										<p className="mt-0.5 text-[10px] text-ink-muted">
											{formatDateTime(capture.created_at)}
										</p>
									</div>
									<Badge tone={STATUS_TONES[capture.status] ?? "neutral"}>
										{LEAD_STATUS_LABELS[capture.status] ?? capture.status}
									</Badge>
								</li>
							))}
						</ul>
					)}
				</Card>
			</section>
		</>
	);
}
