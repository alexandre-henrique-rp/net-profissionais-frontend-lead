import { useEffect, useId, useRef, useState } from "react";
import { Button } from "#/components/ui/Button";
import type { DashboardPeriod, PeriodSelection } from "./api";

const PRESETS: Array<{ period: DashboardPeriod; label: string }> = [
	{ period: "today", label: "Hoje" },
	{ period: "last_7_days", label: "Últimos 7 dias" },
	{ period: "this_month", label: "Este mês" },
	{ period: "last_quarter", label: "Último trimestre" },
	{ period: "this_year", label: "Este ano" },
	{ period: "custom", label: "Personalizado" },
];

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
	today: "Hoje",
	last_7_days: "Últimos 7 dias",
	this_month: "Este mês",
	last_quarter: "Último trimestre",
	this_year: "Este ano",
	custom: "Personalizado",
};

/** Data local no formato que o `<input type="date">` e a API usam. */
function toInputDate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(value: string): string {
	const date = new Date(`${value}T12:00:00`);

	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleDateString("pt-BR");
}

function triggerLabel(selection: PeriodSelection): string {
	if (selection.period !== "custom") {
		return PERIOD_LABELS[selection.period];
	}

	if (selection.startDate && selection.endDate) {
		return `${formatDate(selection.startDate)} – ${formatDate(selection.endDate)}`;
	}

	return PERIOD_LABELS.custom;
}

/** Intervalo completo do período, preservando as datas quando já existirem. */
function withRange(selection: PeriodSelection): PeriodSelection {
	const today = new Date();
	const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

	return {
		...selection,
		startDate: selection.startDate ?? toInputDate(firstDay),
		endDate: selection.endDate ?? toInputDate(today),
	};
}

export interface PeriodFilterProps {
	/** Período aplicado: a tela só muda quando este valor muda. */
	value: PeriodSelection;
	/** Chamado ao confirmar — quem usa refaz a consulta. */
	onChange: (selection: PeriodSelection) => void;
}

/**
 * Seletor de período controlado.
 *
 * Não guarda o período escolhido: recebe o aplicado, edita uma cópia no diálogo
 * e devolve a escolha ao confirmar. Assim o dashboard é a única fonte da query.
 */
export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<PeriodSelection>(() => withRange(value));
	const panelId = useId();
	const rootRef = useRef<HTMLDivElement>(null);
	const startDate = draft.startDate ?? "";
	const endDate = draft.endDate ?? "";
	const rangeIsValid =
		startDate.length > 0 && endDate.length > 0 && startDate <= endDate;

	function focusTrigger() {
		rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
	}

	function openPanel() {
		setDraft(withRange(value));
		setOpen(true);
	}

	function closePanel() {
		setOpen(false);
		focusTrigger();
	}

	useEffect(() => {
		if (!open) return;

		function closeOnOutsidePointer(event: PointerEvent) {
			if (
				rootRef.current &&
				event.target instanceof Node &&
				!rootRef.current.contains(event.target)
			) {
				setOpen(false);
			}
		}

		function closeOnEscape(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			event.preventDefault();
			setOpen(false);
			rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
		}

		document.addEventListener("pointerdown", closeOnOutsidePointer);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeOnOutsidePointer);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [open]);

	function applyPeriod() {
		onChange(draft);
		closePanel();
	}

	return (
		<div ref={rootRef} className="relative">
			<Button
				variant="outline"
				size="sm"
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-controls={panelId}
				onClick={() => (open ? closePanel() : openPanel())}
			>
				📅 Período: {triggerLabel(value)} ▾
			</Button>
			{open ? (
				<div
					id={panelId}
					role="dialog"
					aria-labelledby={`${panelId}-title`}
					className="absolute top-full right-0 z-40 mt-2 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-4 shadow-xl"
				>
					<div className="mb-3">
						<h2
							id={`${panelId}-title`}
							className="text-sm font-bold text-ink-strong"
						>
							Período do painel
						</h2>
						<p className="mt-1 text-xs text-ink-muted">
							Escolha um intervalo para analisar os indicadores.
						</p>
					</div>

					<div className="grid grid-cols-2 gap-2">
						{PRESETS.map((preset) => (
							<button
								key={preset.period}
								type="button"
								aria-pressed={draft.period === preset.period}
								onClick={() =>
									setDraft((current) => ({
										...withRange(current),
										period: preset.period,
									}))
								}
								className={`rounded-md border px-3 py-2 text-left text-xs font-semibold transition-colors ${
									draft.period === preset.period
										? "border-accent-500 bg-accent-50 text-accent-500"
										: "border-line text-ink hover:bg-canvas"
								}`}
							>
								{preset.label}
							</button>
						))}
					</div>

					<div className="mt-4 grid grid-cols-2 gap-3">
						<label className="grid gap-1 text-xs font-semibold text-ink-strong">
							Data inicial
							<input
								aria-label="Data inicial"
								type="date"
								value={startDate}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										period: "custom",
										startDate: event.target.value,
									}))
								}
								className="h-10 min-w-0 rounded-md border border-line-strong bg-canvas px-2 text-xs"
							/>
						</label>
						<label className="grid gap-1 text-xs font-semibold text-ink-strong">
							Data final
							<input
								aria-label="Data final"
								type="date"
								value={endDate}
								onChange={(event) =>
									setDraft((current) => ({
										...current,
										period: "custom",
										endDate: event.target.value,
									}))
								}
								className="h-10 min-w-0 rounded-md border border-line-strong bg-canvas px-2 text-xs"
							/>
						</label>
					</div>
					{!rangeIsValid ? (
						<p role="alert" className="mt-2 text-xs text-brand-600">
							A data inicial deve ser anterior à data final.
						</p>
					) : null}

					<div className="mt-4 flex justify-end gap-2 border-t border-line pt-3">
						<Button variant="outline" size="sm" onClick={closePanel}>
							Cancelar
						</Button>
						<Button size="sm" disabled={!rangeIsValid} onClick={applyPeriod}>
							Aplicar período
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
