import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { installApiMock, POOL_PAGE, USERS_PAGE } from "#/test/apiMock";
import { renderRoute } from "#/test/renderRoute";

const { sessaoAtual } = vi.hoisted(() => ({
	sessaoAtual: {
		value: {
			name: "Alexandre Henrique",
			email: "carlos.admin@netprofissional.com.br",
			role: "ADMIN",
			operationalRole: "ADMIN",
		} as {
			name: string;
			email: string;
			role: "ADMIN" | "USUARIO";
			operationalRole: "ADMIN" | "CAPTADOR" | "VENDEDOR";
		},
	},
}));

vi.mock("#/lib/session", async (importOriginal) => {
	const original = await importOriginal<typeof import("#/lib/session")>();

	return {
		...original,
		getSession: () => sessaoAtual.value,
		useSession: () => sessaoAtual.value,
	};
});

function definirSessao(sessao: typeof sessaoAtual.value) {
	sessaoAtual.value = sessao;
}

describe("sidebar da aplicação", () => {
	it("@spec:AC-016 administrador vê as rotas dele e a rota atual destacada", async () => {
		definirSessao({
			name: "Alexandre Henrique",
			email: "carlos.admin@netprofissional.com.br",
			role: "ADMIN",
			operationalRole: "ADMIN",
		});

		renderRoute("/leads-pool");

		expect(await screen.findByText("OPERAÇÃO COMERCIAL")).toBeInTheDocument();
		expect(screen.getByText("Dashboard Comercial")).toBeInTheDocument();
		expect(screen.getByText("Funil de Vendas")).toBeInTheDocument();
		expect(screen.getByText("Usuários & Permissões")).toBeInTheDocument();

		const atual = screen.getByRole("link", { name: /Pool de Leads/ });
		expect(atual).toHaveAttribute("aria-current", "page");
		expect(atual).toHaveClass("border-brand-500", "bg-brand-50");
	});

	it("@spec:AC-016 vendedor vê as duas visões do funil e não vê gestão de equipe", async () => {
		definirSessao({
			name: "Rafael Nunes",
			email: "rafael.nunes@netprofissional.com.br",
			role: "USUARIO",
			operationalRole: "VENDEDOR",
		});

		renderRoute("/dashboard");

		expect(
			await screen.findByText("Dashboard do Vendedor"),
		).toBeInTheDocument();
		expect(screen.getByText("Meu Funil (Kanban)")).toBeInTheDocument();
		expect(screen.getByText("Lista de Leads")).toBeInTheDocument();
		expect(screen.queryByText("Usuários & Permissões")).not.toBeInTheDocument();
	});

	it("@spec:AC-016 @spec:AC-211 captador vê a entrada por busca de CNPJ", async () => {
		definirSessao({
			name: "Mariana Costa",
			email: "mariana.costa@netprofissional.com.br",
			role: "USUARIO",
			operationalRole: "CAPTADOR",
		});

		renderRoute("/dashboard");

		expect(
			await screen.findByText("Dashboard do Captador"),
		).toBeInTheDocument();
		expect(screen.getByText("Pool de Leads")).toBeInTheDocument();
		expect(screen.getByText("Novo Lead (Busca CNPJ)")).toBeInTheDocument();
		expect(screen.queryByText("Gestão da Equipe")).not.toBeInTheDocument();
		expect(screen.queryByText("Usuários & Permissões")).not.toBeInTheDocument();
		expect(screen.queryByText("Funil de Vendas")).not.toBeInTheDocument();
		expect(screen.queryByText("Meu Funil (Kanban)")).not.toBeInTheDocument();
		expect(screen.queryByText("Lista de Leads")).not.toBeInTheDocument();
	});
});

	it("@spec:AC-222 badge do Pool mostra o total real e some quando é zero", async () => {
		definirSessao({
			name: "Alexandre Henrique",
			email: "carlos.admin@netprofissional.com.br",
			role: "ADMIN",
			operationalRole: "ADMIN",
		});

		renderRoute("/dashboard");

		const pool = await screen.findByRole("link", { name: /Pool de Leads/ });
		await waitFor(() =>
			expect(pool.textContent).toContain(String(POOL_PAGE.meta.total)),
		);
	});

	it("@spec:AC-222 badge do Pool some quando o total é zero", async () => {
		installApiMock({
			"GET /leads/pool": () => ({
				body: {
					success: true,
					data: {
						items: [],
						meta: { page: 1, limit: 1, total: 0, has_more: false },
					},
				},
			}),
		});
		definirSessao({
			name: "Alexandre Henrique",
			email: "carlos.admin@netprofissional.com.br",
			role: "ADMIN",
			operationalRole: "ADMIN",
		});

		renderRoute("/dashboard");

		const poolVazio = await screen.findByRole("link", {
			name: /Pool de Leads/,
		});
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(poolVazio.querySelector(".ml-auto")).toBeNull();
	});

	it("@spec:AC-223 badge de Usuários conta pendentes e some quando é zero", async () => {
		definirSessao({
			name: "Alexandre Henrique",
			email: "carlos.admin@netprofissional.com.br",
			role: "ADMIN",
			operationalRole: "ADMIN",
		});

		renderRoute("/dashboard");

		const usuarios = await screen.findByRole("link", {
			name: /Usuários & Permissões/,
		});
		await waitFor(() =>
			expect(usuarios.textContent).toContain(String(USERS_PAGE.meta.total)),
		);
	});
