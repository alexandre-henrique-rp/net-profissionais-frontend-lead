import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "#/components/layout/PageHeader";
import { Button } from "#/components/ui/Button";
import { Card } from "#/components/ui/Card";
import { API_BASE_URL } from "#/lib/api";
import { useSession } from "#/lib/session";

export const Route = createFileRoute("/_app/settings/webhook")({
	component: WebhookSettingsPage,
});

function WebhookSettingsPage() {
	const session = useSession();
	const [payload, setPayload] = useState(
		'{"name":"Empresa Exemplo","type":"PJ","email":"contato@empresa.com"}',
	);
	const [status, setStatus] = useState("");

	// O endpoint real do backend já é vinculado ao tenant da sessão.
	const webhookUrl = `${API_BASE_URL}/webhooks/leads/${session.tenantId}`;

	return (
		<>
			<PageHeader eyebrow="⚙️ CONFIGURAÇÕES" title="Central de Webhook" />
			<div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
				<Card className="p-5">
					<h2 className="text-base font-bold text-ink-strong">
						Endpoint de entrada
					</h2>
					<p className="mt-1 text-sm text-ink-muted">
						Use a URL abaixo para encaminhar leads recebidos em sistemas
						externos.
					</p>
					<label className="mt-5 grid gap-1.5 text-xs font-bold text-ink-strong">
						URL do webhook
						<input
							readOnly
							value={webhookUrl}
							className="h-11 rounded-md border border-line-strong bg-canvas px-3 font-normal"
						/>
					</label>
					<div className="mt-4 rounded-md border border-line bg-canvas p-3">
						<p className="text-xs font-bold text-ink-strong">
							Token de autorização
						</p>
						<p className="mt-1 text-xs text-ink-muted">
							O token é um segredo do servidor: ele não é exibido nem editável
							aqui. Configure-o no ambiente do backend para validar as chamadas
							recebidas.
						</p>
					</div>
					<h3 className="mt-5 text-xs font-bold text-ink-muted">
						Campos aceitos
					</h3>
					<ul className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink">
						{["name", "type", "document", "email", "phone", "source"].map(
							(field) => (
								<li key={field} className="rounded-md bg-canvas p-2">
									{field}
								</li>
							),
						)}
					</ul>
				</Card>
				<Card className="p-5">
					<h2 className="text-base font-bold text-ink-strong">
						Simulador de disparo
					</h2>
					<p className="mt-1 text-sm text-ink-muted">
						Valide a estrutura do payload sem enviar uma requisição real.
					</p>
					<label
						htmlFor="webhook-payload"
						className="mt-4 block text-xs font-bold text-ink-strong"
					>
						Payload JSON
					</label>
					<textarea
						id="webhook-payload"
						value={payload}
						onChange={(event) => setPayload(event.target.value)}
						className="mt-1.5 min-h-64 w-full rounded-md border border-line-strong bg-canvas p-3 font-mono text-xs outline-none focus:border-accent-500"
					/>
					<div className="mt-4 flex items-center justify-between gap-3">
						{status ? (
							<output className="text-sm text-success-600">{status}</output>
						) : (
							<span />
						)}
						<Button
							onClick={() => {
								try {
									JSON.parse(payload);
									setStatus("Payload válido. Nenhum dado foi enviado.");
								} catch {
									setStatus(
										"JSON inválido. Corrija a estrutura e tente novamente.",
									);
								}
							}}
						>
							Validar payload
						</Button>
					</div>
				</Card>
			</div>
		</>
	);
}
