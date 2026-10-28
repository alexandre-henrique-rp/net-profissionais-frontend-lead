import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "#/components/layout/PageHeader";
import { Button } from "#/components/ui/Button";
import { Card } from "#/components/ui/Card";
import { Field, TextInput } from "#/components/ui/Field";

export const Route = createFileRoute("/_app/settings/")({
	component: IntegrationSettingsPage,
});

const INTEGRATIONS = [
	{
		title: "Google Gemini API",
		description: "Chave de conexão e modelos disponíveis para enriquecimento.",
		key: "GEMINI_API_KEY",
		models: "Gemini Flash gratuito · Gemini Pro avançado",
	},
	{
		title: "OpenRouter",
		description: "Acesso a múltiplos modelos e fallback de IA.",
		key: "OPENROUTER_API_KEY",
		models: "Modelos gratuitos :free · provedores pagos",
	},
];

function IntegrationSettingsPage() {
	const [saved, setSaved] = useState(false);

	return (
		<>
			<PageHeader
				eyebrow="⚙️ CONFIGURAÇÕES & APIS"
				title="Integrações e operação do sistema"
			/>
			<p className="mb-5 max-w-3xl text-sm text-ink-muted">
				As chaves e integrações abaixo são prévias locais da interface. A
				conexão real será habilitada quando os serviços de configuração do
				backend forem disponibilizados.
			</p>
			<div className="grid gap-4 xl:grid-cols-2">
				{INTEGRATIONS.map((integration) => (
					<Card key={integration.key} className="p-5">
						<div className="flex items-start justify-between gap-3">
							<div>
								<h2 className="text-base font-bold text-ink-strong">
									{integration.title}
								</h2>
								<p className="mt-1 text-sm text-ink-muted">
									{integration.description}
								</p>
							</div>
							<span className="rounded-full bg-warning-50 px-2.5 py-1 text-[11px] font-bold text-warning-500">
								Não conectado
							</span>
						</div>
						<Field
							label={integration.key}
							hint="O valor não é enviado nem armazenado nesta demonstração."
						>
							<TextInput type="password" placeholder="••••••••••••••••" />
						</Field>
						<p className="mt-3 text-xs text-ink-muted">{integration.models}</p>
					</Card>
				))}
				<Card className="p-5">
					<div className="flex items-start justify-between gap-3">
						<div>
							<h2 className="text-base font-bold text-ink-strong">
								Consulta e enriquecimento CNPJ/QSA
							</h2>
							<p className="mt-1 text-sm text-ink-muted">
								BrasilAPI primária e ReceitaWS como contingência.
							</p>
						</div>
						<Link
							to="/settings/cnpj"
							className="text-xs font-bold text-info-500"
						>
							Ver dados
						</Link>
					</div>
					<p className="mt-4 rounded-md bg-canvas p-3 text-sm text-ink">
						Razão social, CNAEs, endereço, capital social e quadro societário.
					</p>
				</Card>
				<Card className="p-5">
					<div className="flex items-start justify-between gap-3">
						<div>
							<h2 className="text-base font-bold text-ink-strong">
								Webhook de entrada de leads
							</h2>
							<p className="mt-1 text-sm text-ink-muted">
								Receba oportunidades PJ e PF de páginas externas.
							</p>
						</div>
						<Link
							to="/settings/webhook"
							className="text-xs font-bold text-info-500"
						>
							Abrir central
						</Link>
					</div>
					<p className="mt-4 rounded-md bg-canvas p-3 text-sm text-ink">
						Endpoint, documentação de campos e simulador de payload.
					</p>
				</Card>
				<Card className="p-5 xl:col-span-2">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h2 className="text-base font-bold text-ink-strong">
								Serviço em segundo plano
							</h2>
							<p className="mt-1 text-sm text-ink-muted">
								Fila `queue:lead-enrichment` para pesquisa e resumo de
								oportunidades.
							</p>
						</div>
						<span className="rounded-full bg-info-50 px-2.5 py-1 text-[11px] font-bold text-info-500">
							BullMQ / Redis
						</span>
					</div>
					<div className="mt-4 grid gap-3 sm:grid-cols-3">
						<p className="rounded-md border border-line bg-canvas p-3 text-sm">
							Profundidade de busca: padrão
						</p>
						<p className="rounded-md border border-line bg-canvas p-3 text-sm">
							Website e redes sociais
						</p>
						<p className="rounded-md border border-line bg-canvas p-3 text-sm">
							Resumo registrado na timeline
						</p>
					</div>
				</Card>
			</div>
			<div className="mt-5 flex flex-wrap items-center gap-3">
				<Button
					variant="brand"
					className="font-bold shadow-xs"
					onClick={() => setSaved(true)}
				>
					Salvar configurações
				</Button>
				{saved ? (
					<output className="rounded-md border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
						Preferências locais salvas nesta demonstração.
					</output>
				) : null}
			</div>
		</>
	);
}
