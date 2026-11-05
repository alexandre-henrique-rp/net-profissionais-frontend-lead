import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { installApiMock, mockFailures } from "#/test/apiMock";
import { renderRoute } from "#/test/renderRoute";

describe("ativação de conta", () => {
	it("@spec:AC-025 mostra os critérios e só habilita o envio para senha válida confirmada", async () => {
		renderRoute("/ativar-conta?token=convite-demo");
		const password = await screen.findByLabelText("Nova senha");
		const confirmation = screen.getByLabelText("Confirmar senha");
		const submit = screen.getByRole("button", { name: "Definir senha" });

		expect(screen.getByText("Pelo menos 8 caracteres")).toBeInTheDocument();
		expect(submit).toBeDisabled();
		fireEvent.change(password, { target: { value: "SenhaForte8" } });
		expect(submit).toBeDisabled();
		fireEvent.change(confirmation, { target: { value: "SenhaForte8" } });
		expect(submit).toBeEnabled();
		fireEvent.click(submit);

		// Conta ativada leva direto ao login.
		expect(
			await screen.findByLabelText("E-mail Corporativo"),
		).toBeInTheDocument();
	});

	it("@spec:AC-145 a ativação envia o token do convite e a senha", async () => {
		const api = installApiMock();

		renderRoute("/ativar-conta?token=convite-demo");
		fireEvent.change(await screen.findByLabelText("Nova senha"), {
			target: { value: "SenhaForte8" },
		});
		fireEvent.change(screen.getByLabelText("Confirmar senha"), {
			target: { value: "SenhaForte8" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Definir senha" }));

		// Conta ativada leva direto ao login.
		expect(
			await screen.findByLabelText("E-mail Corporativo"),
		).toBeInTheDocument();
		expect(api.calls).toContainEqual(
			expect.objectContaining({
				method: "POST",
				path: "/auth/activate-account",
				body: { token: "convite-demo", password: "SenhaForte8" },
			}),
		);
	});

	it("@spec:AC-145 convite vencido mostra o erro do contrato", async () => {
		installApiMock({
			"POST /auth/activate-account": () => ({
				status: 410,
				body: {
					success: false,
					error: {
						code: "TOKEN_EXPIRED",
						message: "Convite inválido ou expirado.",
						timestamp: "2026-10-26T12:00:00.000Z",
					},
				},
			}),
		});

		renderRoute("/ativar-conta?token=vencido");
		fireEvent.change(await screen.findByLabelText("Nova senha"), {
			target: { value: "SenhaForte8" },
		});
		fireEvent.change(screen.getByLabelText("Confirmar senha"), {
			target: { value: "SenhaForte8" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Definir senha" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Convite inválido ou expirado.",
		);
	});

	it("mantém a mensagem padrão quando o erro não é da API", async () => {
		installApiMock({
			"POST /auth/activate-account": () => mockFailures.serverError(),
		});

		renderRoute("/ativar-conta?token=convite-demo");
		fireEvent.change(await screen.findByLabelText("Nova senha"), {
			target: { value: "SenhaForte8" },
		});
		fireEvent.change(screen.getByLabelText("Confirmar senha"), {
			target: { value: "SenhaForte8" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Definir senha" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Erro interno do servidor.",
		);
	});
});
