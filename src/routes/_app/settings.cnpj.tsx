import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "#/components/layout/PageHeader";
import { Button } from "#/components/ui/Button";
import { Card } from "#/components/ui/Card";
import { Field, TextInput } from "#/components/ui/Field";
import { ApiError, apiFetch } from "#/lib/api";

export const Route = createFileRoute("/_app/settings/cnpj")({
	component: CnpjSettingsPage,
});

/** Contato do quadro societário devolvido pela API. */
interface CnpjContact {
	name: string;
	role: string;
	is_decision_maker: boolean;
}

/** Resposta de `GET /integrations/cnpj/{cnpj}`. */
interface CnpjLookup {
	company_name: string;
	trade_name: string | null;
	primary_cnae: string;
	cnae_description: string;
	capital_social: number;
	postal_code: string;
	street: string;
	number: string;
	complement: string | null;
	neighborhood: string;
	city: string;
	state: string;
	company_size: string;
	sector: string;
	contacts: CnpjContact[];
}

const CURRENCY = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});

/** `12.345.678/0001-90` → `12345678000190`. */
function onlyDigits(value: string): string {
	return value.replace(/\D/g, "");
}

function formatAddress(data: CnpjLookup): string {
	const street = [data.street, data.number].filter(Boolean).join(", ");
	const complement = data.complement ? ` — ${data.complement}` : "";

	return `${street}${complement} · ${data.neighborhood} · ${data.city}/${data.state} · CEP ${data.postal_code}`;
}

function lookupErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 404 || error.code === "NOT_FOUND") {
			return "CNPJ não encontrado na base da Receita Federal. Confira os dígitos e tente de novo.";
		}

		return error.message || "Não foi possível consultar o CNPJ.";
	}

	return "Não foi possível consultar o CNPJ.";
}

function CnpjSettingsPage() {
	const [cnpj, setCnpj] = useState("");
	const [validation, setValidation] = useState("");
	const lookup = useMutation({
		mutationFn: (digits: string) =>
			apiFetch<CnpjLookup>(`/integrations/cnpj/${digits}`),
	});

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
									value={cnpj}
									onChange={(event) => setCnpj(event.target.value)}
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
									{data.company_name}
								</strong>
							</p>
							<p>
								<span className="block text-xs text-ink-muted">
									Nome fantasia
								</span>
								<strong className="text-sm text-ink-strong">
									{data.trade_name ?? "—"}
								</strong>
							</p>
							<p>
								<span className="block text-xs text-ink-muted">
									Capital social
								</span>
								<strong className="text-sm text-ink-strong">
									{CURRENCY.format(data.capital_social)}
								</strong>
							</p>
							<p className="sm:col-span-2">
								<span className="block text-xs text-ink-muted">
									CNAE principal
								</span>
								<strong className="text-sm text-ink-strong">
									{data.primary_cnae} · {data.cnae_description}
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
									{data.company_size}
								</strong>
							</p>
							<p>
								<span className="block text-xs text-ink-muted">Setor</span>
								<strong className="text-sm text-ink-strong">
									{data.sector}
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
												{contact.is_decision_maker ? " · decisor" : ""}
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
