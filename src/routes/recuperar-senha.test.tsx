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

	it("com token na URL, apresenta a etapa para colocar a nova senha e chama a API", async () => {
		const api = installApiMock({
			"POST /auth/reset-password": () => ({
				body: {
					success: true,
					data: { reset: true },
					meta: { timestamp: "2026-10-26T12:00:00.000Z", version: "v1" },
				},
			}),
		});

		renderRoute("/recuperar-senha?token=token-seguro-123");

		expect(
			await screen.findByRole("heading", { name: "Criar nova senha" }),
		).toBeInTheDocument();
		expect(screen.getByText("Pelo menos 8 caracteres")).toBeInTheDocument();

		const submitBtn = screen.getByRole("button", { name: "Redefinir senha" });
		expect(submitBtn).toBeDisabled();

		fireEvent.change(screen.getByLabelText("Nova senha"), {
			target: { value: "NovaSenhaForte8" },
		});
		expect(submitBtn).toBeDisabled();

		fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
			target: { value: "NovaSenhaForte8" },
		});
		expect(submitBtn).toBeEnabled();

		fireEvent.click(submitBtn);

		expect(await screen.findByRole("status")).toHaveTextContent(
			"Senha redefinida com sucesso",
		);
		expect(
			screen.getByRole("button", { name: "Entrar no Painel →" }),
		).toBeInTheDocument();

		expect(api.calls).toContainEqual(
			expect.objectContaining({
				method: "POST",
				path: "/auth/reset-password",
				body: {
					token: "token-seguro-123",
					password: "NovaSenhaForte8",
				},
			}),
		);
	});

	it("com token inválido ou expirado, exibe mensagem amigável e link para tentar de novo", async () => {
		installApiMock({
			"POST /auth/reset-password": () => ({
				status: 410,
				body: {
					success: false,
					error: {
						code: "TOKEN_EXPIRED",
						message: "Token de redefinição inválido ou expirado.",
					},
					meta: { timestamp: "2026-10-26T12:00:00.000Z", version: "v1" },
				},
			}),
		});

		renderRoute("/recuperar-senha?token=token-expirado");

		await screen.findByRole("heading", { name: "Criar nova senha" });

		fireEvent.change(screen.getByLabelText("Nova senha"), {
			target: { value: "NovaSenhaForte8" },
		});
		fireEvent.change(screen.getByLabelText("Confirmar nova senha"), {
			target: { value: "NovaSenhaForte8" },
		});

		fireEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));

		expect(
			await screen.findByText(/Token de redefinição inválido ou expirado/),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", {
				name: "Solicitar um novo link de recuperação",
			}),
		).toBeInTheDocument();
	});
});
