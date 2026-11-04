import { expect, test } from "@playwright/test";
import { accounts } from "./support/accounts";
import { API_URL, requireSecret } from "./support/env";
import { postSignedWebhook, postTamperedWebhook } from "./support/webhook";

/**
 * Jornada 5 — Webhook externo envia lead com HMAC → enfileiramento e
 * processamento correto; assinatura inválida é recusada.
 *
 * O tenantId é descoberto em runtime pelo login do Admin (/auth/me), para não
 * fixar o ID da seed no teste.
 */
async function descobrirTenantId(request: typeof fetch): Promise<string> {
	const login = await request(`${API_URL}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			email: accounts.admin.email,
			password: accounts.admin.password,
		}),
	});
	if (!login.ok) {
		throw new Error(`[e2e] login do admin falhou: ${login.status}`);
	}
	const cookie = login.headers.get("set-cookie") ?? "";
	const me = await request(`${API_URL}/auth/me`, {
		headers: { cookie },
	});
	const body = (await me.json()) as {
		data?: { tenant?: { id?: string } };
		tenant?: { id?: string };
	};
	const tenantId = body.data?.tenant?.id ?? body.tenant?.id;
	if (!tenantId) {
		throw new Error("[e2e] não achei o tenantId em /auth/me");
	}
	return tenantId;
}

test.describe("Jornada 5 — webhook de captura com HMAC", () => {
	test("assinatura válida é aceita e cria/aceita o lead", async () => {
		requireSecret("webhook");
		const tenantId = await descobrirTenantId(fetch);

		const payload = {
			lead: {
				document: "12.345.678/0001-90",
				company_name: `Empresa Webhook E2E ${Date.now()}`,
				contacts: [{ name: "Ana Souza", phone: "31999998888" }],
			},
			lgpd_consent: true,
		};

		const { status, body } = await postSignedWebhook(tenantId, payload);
		// 2xx: aceito (200/201/202 conforme enfileiramento). Nunca 401/400.
		expect(status, `resposta inesperada: ${JSON.stringify(body)}`).toBeLessThan(
			300,
		);
		expect(status).toBeGreaterThanOrEqual(200);
	});

	test("assinatura inválida é recusada (401)", async () => {
		const tenantId = await descobrirTenantId(fetch);
		const payload = {
			lead: {
				document: "12.345.678/0001-90",
				company_name: "Empresa Adulterada",
				contacts: [{ name: "Fraude", phone: "31900000000" }],
			},
			lgpd_consent: true,
		};

		const { status } = await postTamperedWebhook(tenantId, payload);
		expect(status).toBe(401);
	});
});
