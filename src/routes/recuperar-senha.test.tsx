import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { installApiMock } from "#/test/apiMock";
import { renderRoute } from "#/test/renderRoute";

describe("recuperação de senha", () => {
	it("@spec:AC-024 envia e-mail e apresenta uma confirmação que não revela se a conta existe", async () => {
		renderRoute("/recuperar-senha");
		fireEvent.change(await screen.findByLabelText("E-mail Corporativo"), {
			target: { value: "pessoa@empresa.com" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Enviar instruções" }));

		expect(await screen.findByRole("status")).toHaveTextContent(
			"Se o e-mail estiver cadastrado",
		);
		expect(
			screen.getByRole("link", { name: "Voltar para o login" }),
		).toHaveAttribute("href", "/login");
	});

	it("@spec:AC-144 a recuperação chama a API e mantém a resposta neutra", async () => {
		const api = installApiMock({
			"POST /auth/forgot-password": () => ({
				body: {
					success: true,
					data: { sent: true },
					meta: { timestamp: "2026-10-26T12:00:00.000Z", version: "v1" },
				},
			}),
		});

		renderRoute("/recuperar-senha");
		fireEvent.change(await screen.findByLabelText("E-mail Corporativo"), {
			target: { value: "nao-existe@empresa.com" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Enviar instruções" }));

		expect(await screen.findByRole("status")).toHaveTextContent(
			"Se o e-mail estiver cadastrado",
		);
		expect(api.calls).toContainEqual(
			expect.objectContaining({
				method: "POST",
				path: "/auth/forgot-password",
				body: { email: "nao-existe@empresa.com" },
			}),
		);
	});
});
