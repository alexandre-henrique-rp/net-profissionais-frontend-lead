import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	DASHBOARD_ADMIN,
	DASHBOARD_CAPTADOR,
	DASHBOARD_SELLER,
	installApiMock,
	mockFailures,
} from "#/test/apiMock";
import { renderRoute } from "#/test/renderRoute";

const testRole = vi.hoisted(() => ({ current: "ADMIN" }));

vi.mock("#/lib/session", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#/lib/session")>();
	return {
		...actual,
		useSession: () => ({
			...actual.mockSession,
			role: testRole.current === "ADMIN" ? "ADMIN" : "USUARIO",
			operationalRole: testRole.current,
		}),
	};
});

describe("dashboard", () => {
	beforeEach(() => {
		testRole.current = "ADMIN";
	});

	it("@spec:AC-026 exibe uma visão diferente para Administrador, Captador e Vendedor", async () => {
		testRole.current = "ADMIN";
		renderRoute("/dashboard");
		expect(
			await screen.findByRole("heading", { name: /Dashboard Gerencial/ }),
		).toBeInTheDocument();

		cleanup();
		testRole.current = "CAPTADOR";
		renderRoute("/dashboard");
		expect(
			await screen.findByRole("heading", {
				name: "Dashboard de Produtividade do Captador",
			}),
		).toBeInTheDocument();
		expect(await screen.findByText("Captações recentes")).toBeInTheDocument();

		cleanup();
		testRole.current = "VENDEDOR";
		renderRoute("/dashboard");
		expect(
			await screen.findByRole("heading", {
				name: "Painel Operacional do Vendedor",
			}),
		).toBeInTheDocument();
		expect(await screen.findByText("Tarefas de hoje")).toBeInTheDocument();
		expect(
			screen.getByText("Inteligência de Relacionamento: Datas Especiais"),
		).toBeInTheDocument();
		cleanup();
		testRole.current = "ADMIN";
	});

	it("@spec:AC-020 tem o emblema, o título, o filtro de período e a exportação", async () => {
		renderRoute("/dashboard");

		expect(
			await screen.findByText("📈 MONITORAMENTO & BI COMERCIAL"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", {
				name: /Dashboard Gerencial de Conversão/,
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Período: Este mês/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Exportar/ }),
		).toBeInTheDocument();
	});

	it("@spec:AC-020 a grade de indicadores mostra os quatro KPIs do layout aprovado", async () => {
		renderRoute("/dashboard");

		expect(
			await screen.findByText("VOLUME TOTAL DE LEADS"),
		).toBeInTheDocument();

		const rotulos = [
			"VOLUME TOTAL DE LEADS",
			"PIPELINE EM NEGOCIAÇÃO",
			"RECEITA GANHA (FECHADOS)",
			"ALERTAS DE INATIVIDADE (>48H)",
		];

		for (const rotulo of rotulos) {
			expect(screen.getByText(rotulo)).toBeInTheDocument();
		}

		expect(screen.getByText("486 leads")).toBeInTheDocument();
		expect(screen.getByText("R$ 1.420.000")).toBeInTheDocument();
		expect(screen.getByText("R$ 492.500")).toBeInTheDocument();
		expect(screen.getByText("4 leads")).toBeInTheDocument();
		expect(screen.getByText("8,4% de conversão")).toBeInTheDocument();
		expect(
			screen.getByText("⚠️ Sem contato há mais de 48h"),
		).toBeInTheDocument();
	});

	it("@spec:AC-020 mostra o funil de sete etapas, os motivos de perda e a produtividade", async () => {
		renderRoute("/dashboard");

		expect(
			await screen.findByRole("heading", {
				name: /Taxa de Conversão por Etapa/,
			}),
		).toBeInTheDocument();

		for (let etapa = 1; etapa <= 7; etapa += 1) {
			expect(screen.getByText(new RegExp(`^${etapa}\\.`))).toBeInTheDocument();
		}

		expect(
			screen.getByRole("heading", { name: /Motivos de Perda/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /Produtividade dos Colaboradores/ }),
		).toBeInTheDocument();
	});

	it("@spec:AC-146 o administrador vê KPIs, funil, motivos de perda e produtividade da API", async () => {
		const api = installApiMock();
		renderRoute("/dashboard");

		expect(
			await screen.findByText("VOLUME TOTAL DE LEADS"),
		).toBeInTheDocument();
		expect(screen.getByText("486 leads")).toBeInTheDocument();
		expect(screen.getByText("R$ 1.420.000")).toBeInTheDocument();
		expect(screen.getByText("R$ 492.500")).toBeInTheDocument();
		expect(
			screen.getByText("144 no pool • 342 em carteira"),
		).toBeInTheDocument();

		for (let etapa = 1; etapa <= 7; etapa += 1) {
			expect(screen.getByText(new RegExp(`^${etapa}\\.`))).toBeInTheDocument();
		}
		expect(screen.getByText("86 leads (17,7%)")).toBeInTheDocument();

		expect(screen.getByText("Preço")).toBeInTheDocument();
		expect(screen.getByText("52,2%")).toBeInTheDocument();

		expect(screen.getByText("Rafael Nunes")).toBeInTheDocument();
		expect(
			screen.getByText("42 leads assumidos • 9 ganhos"),
		).toBeInTheDocument();
		expect(screen.getByText("R$ 312.000")).toBeInTheDocument();

		expect(api.calls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: "/dashboard/admin" }),
			]),
		);
	});

	it("@spec:AC-147 @spec:AC-192 o vendedor vê seu painel, agenda e aniversários da API", async () => {
		testRole.current = "VENDEDOR";
		const api = installApiMock();
		renderRoute("/dashboard");

		expect(
			await screen.findByRole("heading", {
				name: "Painel Operacional do Vendedor",
			}),
		).toBeInTheDocument();
		expect(await screen.findByText("37 leads")).toBeInTheDocument();
		expect(
			await screen.findByText("Solar Tech Engenharia"),
		).toBeInTheDocument();
		expect(screen.getByText("Sem contato há mais de 48h")).toBeInTheDocument();
		expect(screen.getByText("Construtora Aliança Minas")).toBeInTheDocument();
		expect(
			screen.getByText("Previsão de fechamento vencida"),
		).toBeInTheDocument();

		expect(screen.getByText(/Ana Beatriz/)).toBeInTheDocument();
		expect(screen.getByText(/29\/10/)).toBeInTheDocument();
		expect(screen.getByText("Aniversário do contato")).toBeInTheDocument();

		expect(api.calls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: "/dashboard/seller" }),
			]),
		);
	});

	it("@spec:AC-201 dashboard Admin sem leads mostra zeros e um caminho para o Pool", async () => {
		const api = installApiMock();
		api.set("GET /dashboard/admin", () => ({
			body: {
				success: true,
				data: {
					...DASHBOARD_ADMIN,
					kpis: {
						...DASHBOARD_ADMIN.kpis,
						total_leads: 0,
						leads_in_pool: 0,
						leads_claimed: 0,
						leads_won: 0,
						leads_lost: 0,
						conversion_rate: 0,
						pipeline_total_value: 0,
						won_total_value: 0,
						average_ticket: 0,
						inactivity_alerts: 0,
					},
					funnel: DASHBOARD_ADMIN.funnel.map((stage) => ({
						...stage,
						count: 0,
						total_value: 0,
					})),
					loss_reasons: [],
					sellers: [],
				},
			},
		}));
		renderRoute("/dashboard");

		expect(
			await screen.findByText(/Nenhum lead foi criado no período selecionado/),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Abrir Pool de Leads" }),
		).toHaveAttribute("href", "/leads-pool");
		expect(screen.getAllByText("0 leads").length).toBeGreaterThan(0);
		expect(screen.queryByText(/NaN|undefined/)).toBeNull();
	});

	it("@spec:AC-202 Vendedor sem carteira recebe um caminho para assumir leads", async () => {
		testRole.current = "VENDEDOR";
		const api = installApiMock();
		api.set("GET /dashboard/seller", () => ({
			body: {
				success: true,
				data: {
					...DASHBOARD_SELLER,
					kpis: {
						...DASHBOARD_SELLER.kpis,
						my_leads: 0,
						my_won: 0,
						my_lost: 0,
						my_conversion_rate: 0,
						my_pipeline_value: 0,
						my_won_value: 0,
						today_tasks: 0,
						today_tasks_total: 0,
					},
					my_funnel: [],
					today_tasks: [],
					birthdays: [],
				},
			},
		}));
		renderRoute("/dashboard");

		expect(
			await screen.findByText("Nenhum lead na sua carteira no período."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Acessar Pool de Leads" }),
		).toHaveAttribute("href", "/leads-pool");
		expect(screen.queryByText(/NaN|undefined/)).toBeNull();
	});

	it("@spec:AC-202 Captador sem captações pode iniciar o primeiro cadastro", async () => {
		testRole.current = "CAPTADOR";
		const api = installApiMock();
		api.set("GET /dashboard/captador", () => ({
			body: {
				success: true,
				data: {
					...DASHBOARD_CAPTADOR,
					kpis: {
						...DASHBOARD_CAPTADOR.kpis,
						captured_total: 0,
						captured_in_pool: 0,
						captured_claimed: 0,
						captured_won: 0,
						conversion_rate: 0,
						captured_total_value: 0,
					},
					by_status: [],
					recent: [],
				},
			},
		}));
		renderRoute("/dashboard");

		expect(
			await screen.findByText("Você ainda não cadastrou leads."),
		).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("link", { name: "Cadastrar primeira captação" }),
		);
		expect(
			await screen.findByRole("dialog", { name: "Novo lead" }),
		).toBeInTheDocument();
		expect(screen.queryByText(/NaN|undefined/)).toBeNull();
	});

	it("@spec:AC-148 @spec:AC-208 o captador vê a situação das captações e os registros recentes da API", async () => {
		testRole.current = "CAPTADOR";
		const api = installApiMock();
		renderRoute("/dashboard");

		expect(
			await screen.findByRole("heading", {
				name: "Dashboard de Produtividade do Captador",
			}),
		).toBeInTheDocument();
		expect(await screen.findByText("52 leads")).toBeInTheDocument();
		expect(screen.getByText("24 leads")).toBeInTheDocument();
		expect(screen.getByText("18 leads")).toBeInTheDocument();

		expect(
			screen.getByText("Status dos seus leads no funil"),
		).toBeInTheDocument();
		expect(screen.getAllByText("Disponível no pool")).not.toHaveLength(0);
		expect(screen.getByText("Em carteira")).toBeInTheDocument();

		expect(screen.getByText("Captações recentes")).toBeInTheDocument();
		expect(screen.getByText("Solar Tech Engenharia LTDA")).toBeInTheDocument();

		expect(api.calls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: "/dashboard/captador" }),
			]),
		);
	});

	it("@spec:AC-149 aplicar um período refaz a consulta com period e as datas do personalizado", async () => {
		const api = installApiMock();
		renderRoute("/dashboard");

		await screen.findByText("VOLUME TOTAL DE LEADS");

		const first = api.calls.find((call) => call.path === "/dashboard/admin");
		expect(first?.url.searchParams.get("period")).toBe("this_month");

		fireEvent.click(screen.getByRole("button", { name: /Período: Este mês/ }));
		fireEvent.click(screen.getByRole("button", { name: "Este ano" }));
		fireEvent.click(screen.getByRole("button", { name: "Aplicar período" }));

		await waitFor(() => {
			expect(
				api.calls.some(
					(call) =>
						call.path === "/dashboard/admin" &&
						call.url.searchParams.get("period") === "this_year",
				),
			).toBe(true);
		});
		expect(
			screen.getByRole("button", { name: /Período: Este ano/ }),
		).toBeInTheDocument();
		expect(api.calls).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: "/dashboard/admin" }),
			]),
		);

		fireEvent.click(screen.getByRole("button", { name: /Período: Este ano/ }));
		fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));
		fireEvent.change(screen.getByLabelText("Data inicial"), {
			target: { value: "2026-09-01" },
		});
		fireEvent.change(screen.getByLabelText("Data final"), {
			target: { value: "2026-09-30" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Aplicar período" }));

		await waitFor(() => {
			const last = api.calls
				.filter((call) => call.path === "/dashboard/admin")
				.at(-1);
			expect(last?.url.searchParams.get("period")).toBe("custom");
			expect(last?.url.searchParams.get("start_date")).toBe("2026-09-01");
			expect(last?.url.searchParams.get("end_date")).toBe("2026-09-30");
		});
	});

	it("@spec:AC-150 o erro mostra um aviso e Tentar novamente refaz a consulta", async () => {
		const api = installApiMock({
			"GET /dashboard/admin": () => mockFailures.serverError(),
		});
		renderRoute("/dashboard");

		const alert = await screen.findByRole("alert");
		expect(alert).toHaveTextContent("Erro interno do servidor.");
		expect(screen.queryByText("VOLUME TOTAL DE LEADS")).not.toBeInTheDocument();

		api.set("GET /dashboard/admin", () => ({
			body: { success: true, data: DASHBOARD_ADMIN },
		}));
		fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

		expect(
			await screen.findByText("VOLUME TOTAL DE LEADS"),
		).toBeInTheDocument();
		expect(
			api.calls.filter((call) => call.path === "/dashboard/admin"),
		).toHaveLength(2);
	});

	it("@spec:AC-171 o botão Exportar chama /leads/export e entrega o arquivo", async () => {
		const api = installApiMock();
		const entregues: string[] = [];
		vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:teste");
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
		vi.spyOn(HTMLElement.prototype, "click").mockImplementation(function (
			this: HTMLAnchorElement,
		) {
			entregues.push(this.download);
		});

		renderRoute("/dashboard");
		await screen.findByText("VOLUME TOTAL DE LEADS");
		fireEvent.click(screen.getByRole("button", { name: /Exportar/ }));

		await waitFor(() => {
			expect(entregues).toEqual(["leads.csv"]);
		});

		const [exportCall] = api.calls.filter(
			(call) => call.path === "/leads/export",
		);
		expect(exportCall).toBeDefined();
		expect(exportCall.url.searchParams.get("format")).toBe("csv");
		expect(exportCall.url.searchParams.get("period")).toBe("this_month");
	});
});
