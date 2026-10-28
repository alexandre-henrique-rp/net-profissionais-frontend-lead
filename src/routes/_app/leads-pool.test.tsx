import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ApiMock,
	installApiMock,
	mockFailures,
	POOL_PAGE,
} from "#/test/apiMock";
import { renderRoute } from "#/test/renderRoute";

const testRole = vi.hoisted(() => ({ current: "ADMIN" }));

vi.mock("#/lib/session", async (importOriginal) => {
	const actual = await importOriginal<typeof import("#/lib/session")>();
	const currentSession = () => ({
		...actual.mockSession,
		role: testRole.current === "ADMIN" ? "ADMIN" : "USUARIO",
		operationalRole: testRole.current,
	});
	return {
		...actual,
		getSession: currentSession,
		useSession: currentSession,
	};
});

let api: ApiMock;

function callsTo(method: string, path: string) {
	return api.calls.filter(
		(call) => call.method === method && call.path === path,
	);
}

function lastPoolCall(): URL | null {
	const calls = callsTo("GET", "/leads/pool");

	return calls.length === 0 ? null : calls[calls.length - 1].url;
}

describe("pool de leads", () => {
	beforeEach(() => {
		testRole.current = "ADMIN";
		api = installApiMock();
	});

	it("@spec:AC-021 mostra o banner de repositório central de entrada", async () => {
		renderRoute("/leads-pool");

		expect(
			await screen.findByText(/REPOSITÓRIO CENTRAL DE ENTRADA/),
		).toBeInTheDocument();
	});

	it("@spec:AC-021 a tabela tem cliente, contato, setor, ticket e ações", async () => {
		renderRoute("/leads-pool");

		const cabecalhos = await screen.findAllByRole("columnheader");
		const textos = cabecalhos.map((th) => th.textContent ?? "");

		expect(textos[0]).toContain("Cliente");
		expect(textos[1]).toContain("Contato");
		expect(textos[2]).toContain("Setor / Segmento");
		expect(textos[3]).toContain("Ticket");
		expect(textos[4]).toContain("Ações");
	});

	it("@spec:AC-021 Admin atribui os leads do pool e Vendedor pode assumir", async () => {
		testRole.current = "ADMIN";
		renderRoute("/leads-pool");

		const atribuir = await screen.findAllByRole("button", {
			name: "👤 Atribuir Vendedor",
		});
		expect(atribuir).toHaveLength(4);
		expect(screen.queryByRole("button", { name: "Assumir Lead ➔" })).toBeNull();

		cleanup();
		testRole.current = "VENDEDOR";
		renderRoute("/leads-pool");
		expect(
			await screen.findAllByRole("button", { name: "Assumir Lead ➔" }),
		).toHaveLength(4);
		expect(
			screen.queryByRole("button", { name: "👤 Atribuir Vendedor" }),
		).toBeNull();
	});

	it("@spec:AC-035 Captador acompanha vendedor e etapa sem ações de assumir ou atribuir", async () => {
		testRole.current = "CAPTADOR";
		renderRoute("/leads-pool");

		expect(
			await screen.findByRole("heading", { name: "Esteira de Captações" }),
		).toBeInTheDocument();
		expect(
			await screen.findByRole("columnheader", { name: "Vendedor responsável" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "Etapa atual" }),
		).toBeInTheDocument();
		const tabela = screen.getByRole("table");
		expect(
			within(tabela).getAllByText("Alexandre Henrique").length,
		).toBeGreaterThan(0);
		expect(within(tabela).getAllByText("Mariana Costa").length).toBeGreaterThan(
			0,
		);
		expect(screen.queryByRole("button", { name: "Assumir Lead ➔" })).toBeNull();
		expect(
			screen.queryByRole("button", { name: "👤 Atribuir Vendedor" }),
		).toBeNull();
	});

	it("@spec:AC-027 o atalho de nova captação abre o formulário PJ/PF", async () => {
		testRole.current = "CAPTADOR";
		renderRoute("/leads-pool?novo=1");

		expect(
			await screen.findByRole("dialog", { name: "Novo lead" }),
		).toBeInTheDocument();
	});

	it("@spec:AC-021 lista os leads da API com documento e ticket", async () => {
		renderRoute("/leads-pool");

		expect(
			await screen.findByText("Solar Tech Engenharia LTDA"),
		).toBeInTheDocument();
		expect(screen.getByText("R$ 42.000,00")).toBeInTheDocument();
		expect(screen.getByText(/ANIV\. DECISOR 14\/11/)).toBeInTheDocument();
	});

	it("@spec:AC-027 cadastra PJ/PF pela API e atribui o lead a um vendedor", async () => {
		renderRoute("/leads-pool");
		fireEvent.click(
			await screen.findByRole("button", {
				name: "+ Novo Lead (Manual / CNPJ)",
			}),
		);
		expect(
			await screen.findByRole("dialog", { name: "Novo lead" }),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("tab", { name: "Pessoa Física (CPF)" }));
		expect(screen.getByLabelText("CPF")).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("tab", { name: "Pessoa Jurídica (CNPJ)" }),
		);
		fireEvent.change(screen.getByLabelText("CNPJ"), {
			target: { value: "12.345.678/0001-90" },
		});
		fireEvent.change(screen.getByLabelText("Razão social"), {
			target: { value: "Nova Empresa Ltda" },
		});
		fireEvent.change(screen.getByLabelText("Contato principal"), {
			target: { value: "Ana Souza" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar lead" }));

		await waitFor(() => {
			expect(callsTo("POST", "/leads/manual")).toHaveLength(1);
		});
		expect(callsTo("POST", "/leads/manual")[0].body).toMatchObject({
			person_type: "PJ",
			cnpj: "12345678000190",
			company_name: "Nova Empresa Ltda",
			contacts: [{ name: "Ana Souza", is_primary: true }],
		});
		expect(await screen.findByRole("status")).toHaveTextContent(
			"incluído no Pool de Leads",
		);

		fireEvent.click(
			screen.getAllByRole("button", { name: "👤 Atribuir Vendedor" })[0],
		);
		expect(
			await screen.findByRole("dialog", { name: "Atribuir lead a vendedor" }),
		).toBeInTheDocument();
		await screen.findByRole("option", { name: "Rafael Nunes" });
		fireEvent.change(screen.getByLabelText("Vendedor responsável"), {
			target: { value: "user-seller" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Atribuir lead" }));
		expect(await screen.findByRole("status")).toHaveTextContent(
			"foi atribuído a Rafael Nunes",
		);
	});

	it("@spec:AC-151 a tabela mostra os itens do GET /leads/pool com documento, contato, setor e ticket", async () => {
		api.set("GET /leads/pool", () => ({
			body: {
				success: true,
				data: {
					items: [
						{ ...POOL_PAGE.items[0], ticketValue: null },
						...POOL_PAGE.items.slice(1),
					],
					meta: { page: 1, limit: 20, total: 4, has_more: false },
				},
			},
		}));
		renderRoute("/leads-pool");

		expect(
			await screen.findByText("Solar Tech Engenharia LTDA"),
		).toBeInTheDocument();
		const tabela = screen.getByRole("table");

		for (const empresa of [
			"Solar Tech Engenharia LTDA",
			"Construtora Aliança Minas LTDA",
			"Agropecuária Triângulo Mineiro S/A",
			"Indústria Química Horizonte LTDA",
		]) {
			expect(within(tabela).getByText(empresa)).toBeInTheDocument();
		}

		expect(
			within(tabela).getByText("CNPJ: 33.456.789/0001-02"),
		).toBeInTheDocument();
		expect(
			within(tabela).getByText("Marcelo Dias (Sócio)"),
		).toBeInTheDocument();
		expect(within(tabela).getByText("Construção")).toBeInTheDocument();
		expect(within(tabela).getByText("R$ 130.000,00")).toBeInTheDocument();
		expect(within(tabela).getByText("—")).toBeInTheDocument();
		expect(screen.getByText(/Página 1 de 1/)).toBeInTheDocument();
	});

	it("@spec:AC-152 aplicar busca/UF/setor/porte/temperatura refaz a query com esses parâmetros e page=1", async () => {
		renderRoute("/leads-pool");

		await screen.findByText("Solar Tech Engenharia LTDA");

		fireEvent.change(screen.getByLabelText("Buscar leads"), {
			target: { value: "tech" },
		});
		fireEvent.change(screen.getByLabelText("Filtrar por UF"), {
			target: { value: "MG" },
		});
		fireEvent.change(screen.getByLabelText("Filtrar por setor"), {
			target: { value: "SOLAR" },
		});
		fireEvent.change(screen.getByLabelText("Filtrar por porte"), {
			target: { value: "EPP" },
		});
		fireEvent.change(screen.getByLabelText("Filtrar por temperatura"), {
			target: { value: "hot" },
		});

		await waitFor(() => {
			const url = lastPoolCall();

			expect(url?.searchParams.get("q")).toBe("tech");
			expect(url?.searchParams.get("uf")).toBe("MG");
			expect(url?.searchParams.get("sector")).toBe("SOLAR");
			expect(url?.searchParams.get("company_size")).toBe("EPP");
			expect(url?.searchParams.get("temperature")).toBe("hot");
			expect(url?.searchParams.get("page")).toBe("1");
		});
	});

	it("@spec:AC-153 assumir chama POST /leads/pool/{id}/claim e recarrega", async () => {
		testRole.current = "VENDEDOR";
		renderRoute("/leads-pool");

		fireEvent.click(
			(await screen.findAllByRole("button", { name: "Assumir Lead ➔" }))[0],
		);

		await waitFor(() => {
			expect(callsTo("POST", "/leads/pool/tenant-lead-1/claim")).toHaveLength(
				1,
			);
		});
		expect(callsTo("POST", "/leads/pool/tenant-lead-1/claim")[0].body).toEqual(
			{},
		);
		await waitFor(() => {
			expect(callsTo("GET", "/leads/pool").length).toBeGreaterThanOrEqual(2);
		});
	});

	it("@spec:AC-154 409 LEAD_ALREADY_ASSIGNED avisa e recarrega a lista", async () => {
		testRole.current = "VENDEDOR";
		api.set("POST /leads/pool/:id/claim", () =>
			mockFailures.conflict(
				"LEAD_ALREADY_ASSIGNED",
				"Este lead já está com outro vendedor.",
			),
		);
		renderRoute("/leads-pool");

		fireEvent.click(
			(await screen.findAllByRole("button", { name: "Assumir Lead ➔" }))[0],
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Este lead já foi atribuído a outra pessoa.",
		);
		await waitFor(() => {
			expect(callsTo("GET", "/leads/pool").length).toBeGreaterThanOrEqual(2);
		});
	});

	it("@spec:AC-155 cadastro manual chama POST /leads/manual e o lead novo aparece", async () => {
		const novoLead = {
			...POOL_PAGE.items[0],
			id: "tenant-lead-novo",
			lead: {
				...POOL_PAGE.items[0].lead,
				companyName: "Nova Empresa Ltda",
				tradeName: "Nova Empresa",
				cnpj: "12345678000190",
				city: "Belo Horizonte",
			},
		};
		let created = false;
		const flow = installApiMock({
			"GET /leads/pool": () => ({
				body: {
					success: true,
					data: {
						items: created ? [novoLead, ...POOL_PAGE.items] : POOL_PAGE.items,
						meta: {
							page: 1,
							limit: 20,
							total: created ? 5 : 4,
							has_more: false,
						},
					},
				},
			}),
			"POST /leads/manual": () => {
				created = true;
				return { status: 201, body: { success: true, data: novoLead } };
			},
		});
		api = flow;

		renderRoute("/leads-pool");
		fireEvent.click(
			await screen.findByRole("button", {
				name: "+ Novo Lead (Manual / CNPJ)",
			}),
		);
		await screen.findByRole("dialog", { name: "Novo lead" });
		fireEvent.change(screen.getByLabelText("CNPJ"), {
			target: { value: "12.345.678/0001-90" },
		});
		fireEvent.change(screen.getByLabelText("Razão social"), {
			target: { value: "Nova Empresa Ltda" },
		});
		fireEvent.change(screen.getByLabelText("Cidade"), {
			target: { value: "Belo Horizonte" },
		});
		fireEvent.change(screen.getByLabelText("Contato principal"), {
			target: { value: "Ana Souza" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar lead" }));

		await waitFor(() => {
			expect(callsTo("POST", "/leads/manual")).toHaveLength(1);
		});
		expect(callsTo("POST", "/leads/manual")[0].body).toMatchObject({
			person_type: "PJ",
			cnpj: "12345678000190",
			company_name: "Nova Empresa Ltda",
			city: "Belo Horizonte",
			contacts: [
				{ name: "Ana Souza", is_primary: true, is_decision_maker: true },
			],
		});
		expect(await screen.findByText("Nova Empresa Ltda")).toBeInTheDocument();
	});

	it("@spec:AC-156 consultar CNPJ chama GET /integrations/cnpj/{cnpj} e preenche o formulário", async () => {
		renderRoute("/leads-pool");
		fireEvent.click(
			await screen.findByRole("button", {
				name: "+ Novo Lead (Manual / CNPJ)",
			}),
		);
		await screen.findByRole("dialog", { name: "Novo lead" });

		fireEvent.change(screen.getByLabelText("CNPJ"), {
			target: { value: "12.345.678/0001-90" },
		});
		fireEvent.click(screen.getByRole("button", { name: "🔍 Buscar CNPJ" }));

		expect(
			await screen.findByText(/Dados da Receita Federal carregados/),
		).toBeInTheDocument();
		expect(callsTo("GET", "/integrations/cnpj/12345678000190")).toHaveLength(1);
		expect(screen.getByLabelText("Razão social")).toHaveValue(
			"Empresa de demonstração",
		);
		expect(screen.getByLabelText(/^CNAE/)).toHaveValue("4321500");
		expect(screen.getByLabelText("Cidade")).toHaveValue("Belo Horizonte");
	});
});
