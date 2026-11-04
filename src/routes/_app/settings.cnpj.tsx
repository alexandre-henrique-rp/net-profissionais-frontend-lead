import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "#/components/layout/PageHeader";
import { Button } from "#/components/ui/Button";
import { Card } from "#/components/ui/Card";
import { Field, TextInput } from "#/components/ui/Field";
import { type CnpjLookup, useCnpjLookup } from "#/features/leads-pool/api";
import { maskCnpj, onlyDigits } from "#/features/leads-pool/data";
import { ApiError } from "#/lib/api";

export const Route = createFileRoute("/_app/settings/cnpj")({
	component: CnpjSettingsPage,
});

const CURRENCY = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

function formatAddress(data: CnpjLookup): string {
	const street = [data.street, data.number].filter(Boolean).join(", ");
	const complement = data.complement ? ` — ${data.complement}` : "";
	const cityState = [data.city, data.state].filter(Boolean).join("/");
	const details = [
		street || null,
		complement || null,
		data.neighborhood,
		cityState || null,
		data.postalCode ? `CEP ${data.postalCode}` : null,
	].filter(Boolean);

	return details.join(" · ") || "Endereço não informado";
}

function lookupErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 422 || error.code === "CNPJ_NOT_FOUND") {
			return "CNPJ não encontrado na base da Receita Federal. Confira os dígitos e tente de novo.";
		}

		return error.message || "Não foi possível consultar o CNPJ.";
	}

	return "Não foi possível consultar o CNPJ.";
}

function CnpjSettingsPage() {
	const [cnpj, setCnpj] = useState("");
	const [validation, setValidation] = useState("");
	const lookup = useCnpjLookup();

	function search() {
		const digits = onlyDigits(cnpj);

		if (digits.length !== 14) {
			setValidation("Informe os 14 dígitos do CNPJ.");
			return;
		}

		setValidation("");
		lookup.mutate(digits);
	}

	const data = lookup.data;

	return (
		<>
			<PageHeader
				eyebrow="⚙️ CONFIGURAÇÕES"
				title="Enriquecimento de CNPJ e quadro societário"
			/>
			<div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
				<Card className="p-5">
					<h2 className="text-base font-bold text-ink-strong">Provedores</h2>
					<div className="mt-4 grid gap-3">
						<div className="rounded-md border border-success-500 bg-success-50 p-4">
							<p className="text-sm font-bold text-success-600">
								BrasilAPI v1 · principal
							</p>
							<p className="mt-1 text-xs text-ink-muted">
								Consulta gratuita de dados cadastrais e CNAEs.
							</p>
						</div>
						<div className="rounded-md border border-line bg-canvas p-4">
							<p className="text-sm font-bold text-ink-strong">
								ReceitaWS · contingência
							</p>
							<p className="mt-1 text-xs text-ink-muted">
								Fallback quando o provedor principal não responde.
							</p>
						</div>
					</div>
					<p className="mt-4 text-xs text-ink-muted">
						A consulta é feita pela API de enriquecimento do backend, com
						contingência automática entre os provedores.
					</p>
				</Card>
				<Card className="p-5">
					<h2 className="text-base font-bold text-ink-strong">
						Consulta de CNPJ
					</h2>
					<p className="mt-1 text-sm text-ink-muted">
						Dados cadastrais e quadro societário usados na ficha do lead.
					</p>
					<form
						className="mt-4 flex flex-wrap items-end gap-3"
						onSubmit={(event) => {
							event.preventDefault();
							search();
						}}
					>
						<div className="min-w-[220px] flex-1">
							<Field label="CNPJ">
								<TextInput
									required
									invalid={validation !== ""}
									inputMode="numeric"
									maxLength={18}
									value={cnpj}
									onChange={(event) => setCnpj(maskCnpj(event.target.value))}
									placeholder="00.000.000/0000-00"
								/>
							</Field>
						</div>
						<Button type="submit" disabled={lookup.isPending}>
							{lookup.isPending ? "Consultando..." : "Consultar"}
						</Button>
					</form>
					{validation ? (
						<p
							role="alert"
							className="mt-3 text-xs font-semibold text-brand-600"
						>
							{validation}
						</p>
					) : null}
					{lookup.isError ? (
						<p
							role="alert"
							className="mt-4 rounded-md border border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-600"
						>
							{lookupErrorMessage(lookup.error)}
						</p>
					) : null}
					{lookup.isPending ? (
						<p className="mt-4 text-sm text-ink-muted">
							Consultando a Receita Federal...
						</p>
					) : null}
					{data ? (
						<output className="mt-5 grid gap-3 rounded-md border border-info-200 bg-info-50 p-4 sm:grid-cols-2">
							<p className="sm:col-span-2">
								<span className="block text-xs text-ink-muted">
									Razão social
								</span>
								<strong className="text-sm text-ink-strong">
									{data.companyName ?? "—"}
								</strong>
							</p>
							<p>
								<span className="block text-xs text-ink-muted">
									Nome fantasia
								</span>
								<strong className="text-sm text-ink-strong">
									{data.tradeName ?? "—"}
								</strong>
							</p>
							<p>
								<span className="block text-xs text-ink-muted">
									Capital social
								</span>
								<strong className="text-sm text-ink-strong">
									{data.capitalSocial === null
										? "—"
										: CURRENCY.format(data.capitalSocial)}
								</strong>
							</p>
							<p className="sm:col-span-2">
								<span className="block text-xs text-ink-muted">
									CNAE principal
								</span>
								<strong className="text-sm text-ink-strong">
									{[data.primaryCnae, data.cnaeDescription]
										.filter(Boolean)
										.join(" · ") || "—"}
								</strong>
							</p>
							<p className="sm:col-span-2">
								<span className="block text-xs text-ink-muted">Endereço</span>
								<strong className="text-sm text-ink-strong">
									{formatAddress(data)}
								</strong>
							</p>
							<p>
								<span className="block text-xs text-ink-muted">Porte</span>
								<strong className="text-sm text-ink-strong">
									{data.companySize ?? "—"}
								</strong>
							</p>
							<div className="sm:col-span-2">
								<span className="block text-xs text-ink-muted">
									Quadro societário
								</span>
								{data.contacts.length === 0 ? (
									<strong className="text-sm text-ink-strong">
										Nenhum sócio informado.
									</strong>
								) : (
									<ul className="mt-1 grid gap-1">
										{data.contacts.map((contact) => (
											<li
												key={contact.name}
												className="text-sm text-ink-strong"
											>
												<strong>{contact.name}</strong>
												{contact.role ? ` · ${contact.role}` : ""}
												{contact.isDecisionMaker ? " · decisor" : ""}
											</li>
										))}
									</ul>
								)}
							</div>
						</output>
					) : null}
				</Card>
			</div>
		</>
	);
}
