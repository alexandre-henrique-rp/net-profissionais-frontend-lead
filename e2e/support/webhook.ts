import { createHmac } from "node:crypto";
import { API_URL, requireSecret } from "./env";

export interface WebhookResult {
	status: number;
	body: unknown;
}

/**
 * Envia um lead pelo webhook de captura passiva com assinatura HMAC-SHA256 do
 * CORPO BRUTO (rawBody), exatamente como o backend valida. O mesmo texto é
 * assinado e enviado — JSON re-serializado quebraria a assinatura.
 */
export async function postSignedWebhook(
	tenantId: string,
	payload: unknown,
): Promise<WebhookResult> {
	const token = requireSecret("webhook");
	const rawBody = JSON.stringify(payload);
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const signature = createHmac("sha256", token).update(rawBody).digest("hex");

	const res = await fetch(`${API_URL}/webhooks/leads/${tenantId}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Timestamp": timestamp,
			"X-Signature": `sha256=${signature}`,
			"Idempotency-Key": `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		},
		body: rawBody,
	});

	let body: unknown = null;
	try {
		body = await res.json();
	} catch {
		body = null;
	}
	return { status: res.status, body };
}

/** Assina um corpo com um token inválido (para testar a recusa 401). */
export async function postTamperedWebhook(
	tenantId: string,
	payload: unknown,
): Promise<WebhookResult> {
	const rawBody = JSON.stringify(payload);
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const signature = createHmac("sha256", "token-invalido")
		.update(rawBody)
		.digest("hex");

	const res = await fetch(`${API_URL}/webhooks/leads/${tenantId}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Timestamp": timestamp,
			"X-Signature": `sha256=${signature}`,
			"Idempotency-Key": `e2e-bad-${Date.now()}`,
		},
		body: rawBody,
	});
	let body: unknown = null;
	try {
		body = await res.json();
	} catch {
		body = null;
	}
	return { status: res.status, body };
}
