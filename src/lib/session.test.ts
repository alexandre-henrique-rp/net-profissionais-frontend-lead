import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getSession } from "#/lib/session";
import { installApiMock, mockFailures } from "#/test/apiMock";
import { renderRoute } from "#/test/renderRoute";

describe("sessão", () => {
	it("@spec:AC-138 a sessão vem do GET /auth/me", async () => {
		const api = installApiMock();

		const session = await getSession();

		expect(api.calls[0]).toMatchObject({ method: "GET", path: "/auth/me" });
		expect(session).toMatchObject({
			userId: "user-admin",
			tenantId: "tenant-1",
			tenantName: "NetProfissional",
			name: "Alexandre Henrique",
			email: "carlos.admin@netprofissional.com.br",
			role: "ADMIN",
			operationalRole: "ADMIN",
		});
	});

	it("@spec:AC-139 sem sessão a rota autenticada cai no login", async () => {
		installApiMock({
			"GET /auth/me": () => mockFailures.unauthorized(),
		});

		renderRoute("/dashboard");

		expect(
			await screen.findByRole("heading", { name: "Bem-vindo de volta" }),
		).toBeInTheDocument();
	});

	it("@spec:AC-143 logout encerra a sessão e volta ao login", async () => {
		const api = installApiMock();

		renderRoute("/leads-pool");
		fireEvent.click(
			await screen.findByRole("button", { name: "Sair da conta" }),
		);

		expect(
			await screen.findByRole("heading", { name: "Bem-vindo de volta" }),
		).toBeInTheDocument();
		expect(api.calls).toContainEqual(
			expect.objectContaining({ method: "POST", path: "/auth/logout" }),
		);
	});
});
