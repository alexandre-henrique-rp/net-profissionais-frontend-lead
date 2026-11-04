import { cleanup, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { installApiMock } from "#/test/apiMock";
import { renderRoute } from "#/test/renderRoute";

const testRole = vi.hoisted(() => ({ current: "ADMIN" }));

vi.mock("#/lib/session", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#/lib/session")>();
	const currentSession = () => ({
		...actual.mockSession,
		userId: "user-admin",
		tenantId: "tenant-1",
		role: testRole.current === "ADMIN" ? "ADMIN" : "USUARIO",
		operationalRole: testRole.current,
	});
	return {
		...actual,
		getSession: currentSession,
		useSession: currentSession,
	};
});

describe("configurações", () => {
	beforeEach(() => {
		testRole.current = "ADMIN";
	});

	it("@spec:AC-031 oferece configurações integradas, webhook e enriquecimento CNPJ ao Administrador", async () => {
		renderRoute("/settings");
		expect(
			await screen.findByRole("heading", {
				name: "Integrações e operação do sistema",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Google Gemini API" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "OpenRouter" }),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Abrir central" })).toHaveAttribute(
			"href",
			"/settings/webhook",
		);
		expect(screen.getByRole("link", { name: "Ver dados" })).toHaveAttribute(
			"href",
			"/settings/cnpj",
		);

		cleanup();
		renderRoute("/settings/webhook");
		expect(
			await screen.findByRole("heading", { name: "Central de Webhook" }),
		).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Payload JSON"), {
			target: { value: "not json" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Validar payload" }));
		expect(screen.getByRole("status")).toHaveTextContent("JSON inválido");

		cleanup();
		renderRoute("/settings/cnpj");
		expect(
			await screen.findByRole("heading", {
				name: "Enriquecimento de CNPJ e quadro societário",
			}),
		).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("CNPJ"), {
			target: { value: "12.345.678/0001-90" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
		expect(await screen.findByRole("status")).toHaveTextContent(
			"Empresa de demonstração",
		);
		cleanup();
	});

	it("@spec:AC-031 impede acesso direto às configurações para os demais papéis", async () => {
		testRole.current = "CAPTADOR";
		renderRoute("/settings/cnpj");
		expect(
			await screen.findByRole("heading", {
				name: "Dashboard de Produtividade do Captador",
			}),
		).toBeInTheDocument();
		expect(
			screen.queryByText("Enriquecimento de CNPJ e quadro societário"),
		).not.toBeInTheDocument();
	});

	it("@spec:AC-169 a tela de CNPJ consulta a API de enriquecimento e mostra os dados", async () => {
		const api = installApiMock();
		renderRoute("/settings/cnpj");
		expect(
			await screen.findByRole("heading", {
				name: "Enriquecimento de CNPJ e quadro societário",
			}),
		).toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("CNPJ"), {
			target: { value: "12345678000190" },
		});
		expect(screen.getByLabelText("CNPJ")).toHaveValue("12.345.678/0001-90");
		fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

		const resultado = await screen.findByRole("status");
		expect(resultado).toHaveTextContent("Empresa de demonstração");
		expect(resultado).toHaveTextContent("Serviços profissionais");
		expect(resultado).toHaveTextContent("Marcelo Dias");

		const chamada = api.calls.find(
			(call) =>
				call.method === "GET" &&
				call.path === "/integrations/cnpj/12345678000190",
		);
		expect(chamada).toBeDefined();
	});

	it("@spec:AC-169 avisa quando o CNPJ não é encontrado", async () => {
		const api = installApiMock();
		api.set("GET /integrations/cnpj/:cnpj", () => ({
			status: 422,
			body: {
				success: false,
				error: {
					code: "CNPJ_NOT_FOUND",
					message: "Não foi possível obter os dados deste CNPJ.",
					timestamp: "2026-10-26T12:00:00.000Z",
				},
			},
		}));
		renderRoute("/settings/cnpj");
		await screen.findByRole("heading", {
			name: "Enriquecimento de CNPJ e quadro societário",
		});
		fireEvent.change(screen.getByLabelText("CNPJ"), {
			target: { value: "00.000.000/0000-00" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"CNPJ não encontrado",
		);
	});

	it("@spec:AC-170 a central de webhook exibe a URL do tenant e não expõe o token", async () => {
		renderRoute("/settings/webhook");
		expect(
			await screen.findByRole("heading", { name: "Central de Webhook" }),
		).toBeInTheDocument();

		const url = screen.getByLabelText("URL do webhook") as HTMLInputElement;
		expect(url.value).toMatch(/\/webhooks\/leads\/tenant-1$/);

		// O token é segredo do servidor: não existe campo nem valor na tela.
		expect(screen.queryByDisplayValue(/demo-webhook-token/)).toBeNull();
		expect(screen.queryByRole("textbox", { name: /token/i })).toBeNull();
		expect(screen.getByText(/segredo do servidor/i)).toBeInTheDocument();
	});
});
