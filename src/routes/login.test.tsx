import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { installApiMock, mockFailures } from "#/test/apiMock";
import { renderRoute } from "#/test/renderRoute";

describe("tela de login", () => {
	it("@spec:AC-019 mostra o herói da marca à esquerda e o card de acesso à direita", async () => {
		renderRoute("/login");

		expect(
			await screen.findByRole("heading", { name: /Gerador e Gerenciador/ }),
		).toBeInTheDocument();
		expect(screen.getByText("Inteligente de Leads")).toBeInTheDocument();

		expect(
			screen.getByRole("heading", { name: "Bem-vindo de volta" }),
		).toBeInTheDocument();
		expect(screen.getByText("🔒 Acesso Seguro")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Primeiro acesso? Ativar conta" }),
		).toHaveAttribute("href", "/ativar-conta");
	});

	it("@spec:AC-019 o card tem as abas Administrador e Usuário", async () => {
		renderRoute("/login");

		const abas = await screen.findAllByRole("tab");
		expect(abas).toHaveLength(2);
		expect(abas[0]).toHaveTextContent("Administrador");
		expect(abas[1]).toHaveTextContent("Usuário");
		expect(abas[0]).toHaveAttribute("aria-selected", "true");
	});

	it("@spec:AC-019 expõe e-mail, senha e o aviso de conexão segura", async () => {
		renderRoute("/login");

		expect(
			await screen.findByLabelText("E-mail Corporativo"),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Senha de Acesso")).toBeInTheDocument();
		expect(
			screen.getByText("🔒 Conexão Criptografada e Segura"),
		).toBeInTheDocument();
	});
});

describe("login com a API", () => {
	async function preencherEGravar() {
		fireEvent.change(await screen.findByLabelText("E-mail Corporativo"), {
			target: { value: "carlos.admin@netprofissional.com.br" },
		});
		fireEvent.change(screen.getByLabelText("Senha de Acesso"), {
			target: { value: "SenhaForte8" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "ENTRAR NO PAINEL DE LEADS →" }),
		);
	}

	it("@spec:AC-140 login válido abre a sessão e entra no painel", async () => {
		const api = installApiMock();
		renderRoute("/login");

		await preencherEGravar();

		expect(
			await screen.findByRole("heading", { name: /Dashboard Gerencial/ }),
		).toBeInTheDocument();
		expect(api.calls).toContainEqual(
			expect.objectContaining({
				method: "POST",
				path: "/auth/login",
				body: {
					email: "carlos.admin@netprofissional.com.br",
					password: "SenhaForte8",
				},
			}),
		);
	});

	it("@spec:AC-141 login inválido mostra a mensagem do backend", async () => {
		installApiMock({
			"POST /auth/login": () => mockFailures.invalidCredentials(),
		});
		renderRoute("/login");

		await preencherEGravar();

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"E-mail ou senha inválidos.",
		);
		expect(
			screen.getByRole("heading", { name: "Bem-vindo de volta" }),
		).toBeInTheDocument();
	});

	it("@spec:AC-142 excesso de tentativas informa a espera em segundos", async () => {
		installApiMock({
			"POST /auth/login": () => mockFailures.rateLimit(),
		});
		renderRoute("/login");

		await preencherEGravar();

		expect(await screen.findByRole("alert")).toHaveTextContent("900 segundos");
	});
});
