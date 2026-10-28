/**
 * Dashboard: contrato de `GET /dashboard/{admin|seller|captador}` e exportação.
 *
 * Os períodos e o formato das datas vêm do backend; a tela só escolhe um deles
 * e repassa. Nenhuma tela deve montar esses parâmetros por conta própria.
 */

import { queryOptions, useQuery } from "@tanstack/react-query";
import {
	apiDownload,
	apiFetch,
	type DownloadedFile,
	saveDownloadedFile,
} from "#/lib/api";

/** Opções rápidas de período aceitas pela API. */
export const DASHBOARD_PERIODS = [
	"today",
	"last_7_days",
	"this_month",
	"last_quarter",
	"this_year",
	"custom",
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

/** Período escolhido na tela. As datas só valem em `custom` (`AAAA-MM-DD`). */
export interface PeriodSelection {
	period: DashboardPeriod;
	startDate?: string;
	endDate?: string;
}

/** Intervalo resolvido pelo backend, com rótulo pronto para exibição. */
export interface DashboardPeriodRange {
	from: string;
	to: string;
	label: string;
}

/** Uma coluna do gráfico de funil. */
export interface FunnelStage {
	stage_id: string;
	stage_name: string;
	code: string;
	position: number;
	color_hex: string;
	count: number;
	total_value: number;
}

/** Motivo de perda com participação sobre o total de perdidos. */
export interface LossReason {
	code: string;
	label: string;
	count: number;
	percentage: number;
}

/** Produtividade de um vendedor no período. */
export interface SellerPerformance {
	user_id: string;
	name: string;
	claimed_count: number;
	won_count: number;
	total_value: number;
}

export interface AdminDashboard {
	kpis: {
		total_leads: number;
		leads_in_pool: number;
		leads_claimed: number;
		leads_won: number;
		leads_lost: number;
		conversion_rate: number;
		conversion_rate_basis: "won_over_total";
		pipeline_total_value: number;
		won_total_value: number;
		average_ticket: number;
		inactivity_alerts: number;
	};
	funnel: FunnelStage[];
	loss_reasons: LossReason[];
	sellers: SellerPerformance[];
	period: DashboardPeriodRange;
}

/** Pendência da agenda do dia. */
export interface TodayTask {
	tenant_lead_id: string;
	company_name: string | null;
	stage_name: string | null;
	reason: string;
}

/** Data especial dentro da janela de 7 dias. */
export interface Birthday {
	lead_id: string;
	company_name: string | null;
	contact_name: string | null;
	date_type: string;
	day_month: string;
	days_until: number;
	is_today: boolean;
}

export interface SellerDashboard {
	kpis: {
		my_leads: number;
		my_won: number;
		my_lost: number;
		my_conversion_rate: number;
		my_conversion_rate_basis: "won_over_total";
		my_pipeline_value: number;
		my_won_value: number;
		today_tasks: number;
		today_tasks_total: number;
	};
	my_funnel: FunnelStage[];
	today_tasks: TodayTask[];
	birthdays: Birthday[];
}

export interface StatusCount {
	status: string;
	count: number;
}

/** Captação recente da esteira. */
export interface RecentCapture {
	tenant_lead_id: string;
	company_name: string | null;
	created_at: string;
	status: string;
}

export interface CaptadorDashboard {
	kpis: {
		captured_total: number;
		captured_in_pool: number;
		captured_claimed: number;
		captured_won: number;
		conversion_rate: number;
		conversion_rate_basis: "won_over_total";
		captured_total_value: number;
	};
	by_status: StatusCount[];
	recent: RecentCapture[];
}

/** Query string enviada aos três endpoints. */
function periodQuery(selection: PeriodSelection) {
	const custom = selection.period === "custom";

	return {
		period: selection.period,
		start_date: custom ? selection.startDate : undefined,
		end_date: custom ? selection.endDate : undefined,
	};
}

export const dashboardKeys = {
	admin: (selection: PeriodSelection) =>
		[
			"dashboard",
			"admin",
			selection.period,
			selection.startDate,
			selection.endDate,
		] as const,
	seller: (selection: PeriodSelection) =>
		[
			"dashboard",
			"seller",
			selection.period,
			selection.startDate,
			selection.endDate,
		] as const,
	captador: (selection: PeriodSelection) =>
		[
			"dashboard",
			"captador",
			selection.period,
			selection.startDate,
			selection.endDate,
		] as const,
};

export function adminDashboardQueryOptions(selection: PeriodSelection) {
	return queryOptions({
		queryKey: dashboardKeys.admin(selection),
		queryFn: () =>
			apiFetch<AdminDashboard>("/dashboard/admin", {
				query: periodQuery(selection),
			}),
		retry: false,
	});
}

export function sellerDashboardQueryOptions(selection: PeriodSelection) {
	return queryOptions({
		queryKey: dashboardKeys.seller(selection),
		queryFn: () =>
			apiFetch<SellerDashboard>("/dashboard/seller", {
				query: periodQuery(selection),
			}),
		retry: false,
	});
}

export function captadorDashboardQueryOptions(selection: PeriodSelection) {
	return queryOptions({
		queryKey: dashboardKeys.captador(selection),
		queryFn: () =>
			apiFetch<CaptadorDashboard>("/dashboard/captador", {
				query: periodQuery(selection),
			}),
		retry: false,
	});
}

export function useAdminDashboard(selection: PeriodSelection) {
	return useQuery(adminDashboardQueryOptions(selection));
}

export function useSellerDashboard(selection: PeriodSelection) {
	return useQuery(sellerDashboardQueryOptions(selection));
}

export function useCaptadorDashboard(selection: PeriodSelection) {
	return useQuery(captadorDashboardQueryOptions(selection));
}

export type ExportFormat = "csv" | "pdf";

/** Baixa a exportação de leads do período escolhido (sem salvar no disco). */
export function exportLeads(
	format: ExportFormat,
	selection: PeriodSelection,
): Promise<DownloadedFile> {
	return apiDownload("/leads/export", {
		query: { format, ...periodQuery(selection) },
		fallbackFilename: `leads.${format}`,
	});
}

/** Baixa a exportação e entrega o arquivo ao navegador. */
export async function downloadLeads(
	format: ExportFormat,
	selection: PeriodSelection,
): Promise<void> {
	saveDownloadedFile(await exportLeads(format, selection));
}
