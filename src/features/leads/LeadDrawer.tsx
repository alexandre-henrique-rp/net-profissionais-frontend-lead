import { useEffect, useState } from "react";
import { Badge } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Drawer } from "#/components/ui/Drawer";
import {
	errorMessage,
	useAddTimelineNote,
	useLeadDetail,
	useUnlinkLead,
} from "#/features/pipeline/api";
import {
	alvoDaFicha,
	formatCurrency,
	formatDateBR,
	formatProbability,
	type LeadTarget,
	type TermosComerciais,
	TIPO_INTERACAO_LABEL,
	termosDaFicha,
} from "#/features/pipeline/data";

export interface LeadDrawerProps {
	/** Card selecionado; `null` fecha a gaveta. */
	leadId: string | null;
	onClose: () => void;
	onEditTerms: (termos: TermosComerciais) => void;
	onMarkLost: (alvo: LeadTarget) => void;
	onUnlinked: (companyName: string) => void;
}

function formatDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/** Ficha completa do lead — contato, datas, dados fiscais e linha do tempo. */
export function LeadDrawer({
	leadId,
	onClose,
	onEditTerms,
	onMarkLost,
	onUnlinked,
}: LeadDrawerProps) {
	const [note, setNote] = useState("");
	const [actionError, setActionError] = useState("");
	// Notas recém-criadas: aparecem na hora, antes de a ficha ser recarregada.
	const [recentNotes, setRecentNotes] = useState<
		{ id: string; content: string; createdAt: string }[]
	>([]);
	const detail = useLeadDetail(leadId);
	const addNote = useAddTimelineNote();
	const unlink = useUnlinkLead();

	// Cada lead aberto começa com o formulário limpo.
	useEffect(() => {
		if (!leadId) return;
		setNote("");
		setActionError("");
		setRecentNotes([]);
	}, [leadId]);

	const lead = detail.data;
	const primaryContact =
		lead?.contacts.find((contact) => contact.is_primary) ?? lead?.contacts[0];
	const title = lead ? lead.lead.company_name : "Ficha do lead";
	const documentLabel = lead
		? `${lead.lead.trade_name ? `${lead.lead.trade_name} · ` : ""}${
				lead.lead.person_type === "PF" ? "CPF" : "CNPJ"
			}: ${lead.lead.cnpj ?? lead.lead.cpf ?? "não informado"}`
		: undefined;
	const locationLabel = lead
		? [lead.lead.city, lead.lead.state].filter(Boolean).join("/")
		: "";
	const timeline = lead
		? [
				...recentNotes.map((item) => ({
					id: item.id,
					type: "NOTE",
					title: null,
					content: item.content,
					created_at: item.createdAt,
					user: lead.assigned_user
						? { id: lead.assigned_user.id, name: lead.assigned_user.name }
						: null,
				})),
				...lead.timeline,
			].filter(
				(entry, index, all) =>
					all.findIndex((item) => item.content === entry.content) === index,
			)
		: [];

	function handleUnlink() {
		if (!lead) return;
		setActionError("");
		unlink.mutate(
			{ id: lead.id },
			{
				onSuccess: () => {
					onUnlinked(lead.lead.company_name);
					onClose();
				},
				onError: (error) => setActionError(errorMessage(error)),
			},
		);
	}

	function handleNoteSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!lead || !note.trim()) return;
		setActionError("");
		addNote.mutate(
			{ id: lead.id, content: note.trim(), type: "NOTE" },
			{
				onSuccess: (_entry, input) => {
					setNote("");
					setRecentNotes((current) => [
						{
							id: `recent-${Date.now()}`,
							content: input.content,
							createdAt: new Date().toISOString(),
						},
						...current,
					]);
				},
				onError: (error) => setActionError(errorMessage(error)),
			},
		);
	}

	return (
		<Drawer
			open={Boolean(leadId)}
			title={title}
			description={
				lead
					? `${documentLabel}${locationLabel ? ` · ${locationLabel}` : ""}`
					: undefined
			}
			onClose={onClose}
		>
			{detail.isPending && leadId ? (
				<p className="py-10 text-center text-sm text-ink-muted">
					Carregando ficha do lead…
				</p>
			) : null}

			{detail.isError ? (
				<div
					role="alert"
					className="grid gap-3 rounded-xl border border-brand-500 bg-brand-50 p-4 text-sm text-brand-600"
				>
					<p>{errorMessage(detail.error)}</p>
					<Button size="sm" variant="outline" onClick={() => detail.refetch()}>
						Tentar novamente
					</Button>
				</div>
			) : null}

			{lead ? (
				<div className="grid gap-5">
					<div className="flex items-center justify-between rounded-xl border border-line bg-canvas px-4 py-3 shadow-xs">
						<div className="flex items-center gap-2">
							<span
								className="size-2 rounded-full"
								style={{ backgroundColor: lead.stage.color_hex }}
							/>
							<span className="text-xs font-bold tracking-wide text-ink-strong uppercase">
								Etapa: {lead.stage.name}
							</span>
						</div>
						<span className="text-[11px] font-bold text-ink-muted">
							{lead.assigned_user?.name ?? "Sem vendedor"}
						</span>
					</div>

					<div className="flex flex-wrap gap-2 border-b border-line pb-4">
						{primaryContact?.whatsapp_url ? (
							<a
								href={primaryContact.whatsapp_url}
								target="_blank"
								rel="noreferrer"
								aria-label="WhatsApp Web"
								className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-accent-500"
							>
								<span>💬</span>
								<span>WhatsApp Web</span>
							</a>
						) : null}
						<Button
							variant="outline"
							size="sm"
							onClick={() => onEditTerms(termosDaFicha(lead))}
						>
							Editar valor
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="text-brand-600 hover:bg-brand-50"
							onClick={() => onMarkLost(alvoDaFicha(lead))}
						>
							Marcar como perdido
						</Button>
						<Button
							variant="ghost"
							size="sm"
							disabled={unlink.isPending}
							onClick={handleUnlink}
						>
							Devolver ao pool
						</Button>
					</div>

					{actionError ? (
						<p
							role="alert"
							className="rounded-md border border-brand-500 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600"
						>
							{actionError}
						</p>
					) : null}

					<section className="rounded-xl border border-line bg-canvas p-4 shadow-xs">
						<h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-strong uppercase">
							<span>👤</span>
							<span>Contatos</span>
						</h3>
						{lead.contacts.length === 0 ? (
							<p className="mt-3 text-xs text-ink-muted">
								Nenhum contato cadastrado.
							</p>
						) : (
							<ul className="mt-3 grid gap-2">
								{lead.contacts.map((contact) => (
									<li
										key={contact.id}
										className="rounded-lg border border-line bg-surface p-3.5 shadow-xs"
									>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<p className="text-[13px] font-bold text-ink-strong">
												{contact.name}
												{contact.is_decision_maker ? " (Decisor)" : ""}
											</p>
											{contact.role ? (
												<Badge tone="accent">{contact.role}</Badge>
											) : null}
										</div>
										<p className="mt-1 text-xs text-ink-muted">
											{contact.phone ? `📱 +${contact.phone}` : "Sem telefone"}
											{contact.email ? ` • ✉️ ${contact.email}` : ""}
										</p>
									</li>
								))}
							</ul>
						)}
					</section>

					<section>
						<h3 className="text-xs font-bold tracking-wider text-ink-strong uppercase">
							Datas especiais
						</h3>
						{lead.special_dates.length === 0 ? (
							<p className="mt-2 text-xs text-ink-muted">
								Nenhuma data especial cadastrada.
							</p>
						) : (
							<ul className="mt-2 flex flex-wrap gap-2">
								{lead.special_dates.map((date) => (
									<li
										key={date.id}
										className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800"
									>
										<span>🎂</span>
										<span>{date.description}</span>
									</li>
								))}
							</ul>
						)}
					</section>

					<section className="rounded-xl border border-line bg-canvas p-4 shadow-xs">
						<h3 className="text-xs font-bold tracking-wider text-ink-strong uppercase">
							Dados fiscais
						</h3>
						<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
							<div>
								<dt className="text-ink-muted">CNPJ</dt>
								<dd className="font-semibold text-ink-strong">
									{lead.fiscal.cnpj ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-ink-muted">Porte</dt>
								<dd className="font-semibold text-ink-strong">
									{lead.fiscal.company_size ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-ink-muted">CNAE</dt>
								<dd className="font-semibold text-ink-strong">
									{lead.fiscal.primary_cnae ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-ink-muted">Capital social</dt>
								<dd className="font-semibold text-ink-strong">
									{formatCurrency(lead.fiscal.capital_social)}
								</dd>
							</div>
							<div className="col-span-2">
								<dt className="text-ink-muted">Atividade</dt>
								<dd className="font-semibold text-ink-strong">
									{lead.fiscal.cnae_description ?? "—"}
								</dd>
							</div>
						</dl>
					</section>

					<section className="grid gap-2 rounded-xl border border-line bg-surface p-4 text-xs">
						<h3 className="text-xs font-bold tracking-wider text-ink-strong uppercase">
							Negociação
						</h3>
						<p className="text-ink-muted">
							Ticket estimado:{" "}
							<strong className="font-bold text-emerald-600">
								{formatCurrency(lead.ticket_value)}
							</strong>
						</p>
						<p className="text-ink-muted">
							Probabilidade:{" "}
							<strong className="font-bold text-ink-strong">
								{formatProbability(lead.close_probability)}
							</strong>
						</p>
						<p className="text-ink-muted">
							Previsão de fechamento:{" "}
							<strong className="font-bold text-ink-strong">
								{formatDateBR(lead.expected_close_date)}
							</strong>
						</p>
						{lead.proposal_scope ? (
							<p className="text-ink-muted">
								Escopo:{" "}
								<span className="font-semibold text-ink-strong">
									{lead.proposal_scope}
								</span>
							</p>
						) : null}
					</section>

					<section>
						<h3 className="text-xs font-bold tracking-wider text-ink-strong uppercase">
							Linha do tempo ({timeline.length})
						</h3>
						<form className="mt-3 grid gap-2" onSubmit={handleNoteSubmit}>
							<label className="sr-only" htmlFor="lead-note">
								Registrar uma nota
							</label>
							<textarea
								id="lead-note"
								value={note}
								onChange={(event) => setNote(event.target.value)}
								placeholder="Escreva uma nota ou registre uma interação..."
								className="min-h-24 rounded-xl border border-line-strong bg-canvas p-3.5 text-xs text-ink-strong outline-none transition-colors focus:border-accent-500 focus:bg-surface"
							/>
							<div className="flex justify-end">
								<Button
									type="submit"
									variant="brand"
									size="sm"
									className="font-bold shadow-xs"
									disabled={!note.trim() || addNote.isPending}
								>
									Salvar nota
								</Button>
							</div>
						</form>
						{timeline.length === 0 ? (
							<p className="mt-4 rounded-xl border border-dashed border-line-strong p-4 text-center text-xs text-ink-muted">
								Nenhuma interação registrada ainda.
							</p>
						) : (
							<ul className="mt-4 grid gap-2.5">
								{timeline.map((entry) => (
									<li
										key={entry.id}
										className="rounded-xl border border-line bg-canvas p-3 text-xs text-ink"
									>
										<p className="font-semibold text-ink-strong">
											{entry.title ??
												TIPO_INTERACAO_LABEL[entry.type] ??
												entry.type}
										</p>
										<p className="mt-0.5 whitespace-pre-line text-[11px]">
											{entry.content}
										</p>
										<p className="mt-1 text-[10px] text-ink-muted">
											{formatDateTime(entry.created_at)} •{" "}
											{entry.user?.name ?? "Sistema"}
										</p>
									</li>
								))}
							</ul>
						)}
					</section>
				</div>
			) : null}
		</Drawer>
	);
}
