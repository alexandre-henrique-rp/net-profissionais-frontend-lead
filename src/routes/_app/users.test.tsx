import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { installApiMock, type MockResponse, USERS_PAGE } from "#/test/apiMock";
import { renderRoute } from "#/test/renderRoute";

const { sessaoAtual } = vi.hoisted(() => ({
	sessaoAtual: {
		value: {
			userId: "user-admin",
			tenantId: "tenant-1",
			tenantName: "NetProfissional",
			name: "Alexandre Henrique",
			email: "carlos.admin@netprofissional.com.br",
			role: "ADMIN",
			operationalRole: "ADMIN",
		} as {
			userId: string;
			tenantId: string;
			tenantName: string;
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

type FixtureUser = (typeof USERS_PAGE)["items"][number] &
	Record<string, unknown>;

/** Envelope de sucesso, igual ao que o `apiFetch` desembrulha. */
function envelope(data: unknown): MockResponse {
	return { body: { success: true, data } };
}

/** Página de `GET /users` a partir de uma lista mutável. */
function pageOf(items: readonly unknown[]): MockResponse {
	return envelope({
		items,
		meta: { page: 1, limit: 20, total: items.length, has_more: false },
	});
}

/**
 * Dublê com estado: as escritas alteram a lista que o `GET /users` devolve.
 *
 * É o que prova o "invalida e recarrega": sem a invalidação, a tabela
 * continuaria mostrando a lista antiga mesmo com a API já alterada.
 */
function installStatefulUsersMock() {
	const items: FixtureUser[] = [
		...USERS_PAGE.items,
	] as unknown as FixtureUser[];

	const api = installApiMock({
		"GET /users": () => pageOf(items),
		"POST /users/invite": ({ body }) => {
			const draft = body as {
				name: string;
				email: string;
				role?: "ADMIN" | "USUARIO";
				operational_role: "ADMIN" | "CAPTADOR" | "VENDEDOR";
			};
			const novo: FixtureUser = {
				id: `user-${items.length + 1}`,
				name: draft.name,
				email: draft.email,
				role: draft.role ?? "USUARIO",
				operationalRole: draft.operational_role,
				status: "PENDING",
				inviteExpiresAt: "2026-10-30T12:00:00.000Z",
				lastLoginAt: null,
				createdAt: "2026-10-28T12:00:00.000Z",
			};
			items.push(novo);

			return {
				status: 201,
				...envelope({
					invite_id: "invite-2",
					email: novo.email,
					role: novo.role,
					operational_role: novo.operationalRole,
					expires_at: novo.inviteExpiresAt,
					message: "Convite enviado.",
				}),
			};
		},
		"PATCH /users/:id": ({ params, body }) => {
			const patch = body as {
				name?: string;
				role?: "ADMIN" | "USUARIO";
				operational_role?: "ADMIN" | "CAPTADOR" | "VENDEDOR";
				status?: "ACTIVE" | "PENDING";
			};
			const index = items.findIndex((item) => item.id === params.id);
			const atual = items[index];

			items[index] = {
				...atual,
				name: patch.name ?? atual.name,
				role: patch.role ?? atual.role,
				operationalRole: patch.operational_role ?? atual.operationalRole,
				status: patch.status ?? atual.status,
			};

			return envelope(items[index]);
		},
		"POST /users/:id/block": ({ params, body }) => {
			const reassign = body as { reassign_to_user_id: string };
			const index = items.findIndex((item) => item.id === params.id);
			items[index] = { ...items[index], status: "BLOCKED" };

			return envelope({
				blocked: true,
				reassigned: 2,
				user_id: params.id,
				status: "BLOCKED",
				transferred_to: reassign.reassign_to_user_id,
				message: "Colaborador bloqueado.",
			});
		},
	});

	return api;
}

function usarAdministrador() {
	sessaoAtual.value = {
		userId: "user-admin",
		tenantId: "tenant-1",
		tenantName: "NetProfissional",
		name: "Alexandre Henrique",
		email: "carlos.admin@netprofissional.com.br",
		role: "ADMIN",
		operationalRole: "ADMIN",
	};
}

describe("gestão de usuários", () => {
	it("@spec:AC-206 tenant sem colaboradores mantém o convite disponível", async () => {
		usarAdministrador();
		installApiMock({ "GET /users": () => pageOf([]) });
		renderRoute("/users");

		expect(
			await screen.findByText("Nenhum colaborador cadastrado."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "+ Convidar por e-mail" }),
		).toBeEnabled();
	});

	it("@spec:AC-023 a tabela lista nome, e-mail, perfil, subfunção, status e data", async () => {
		usarAdministrador();
		renderRoute("/users");

		const cabecalhos = await screen.findAllByRole("columnheader");
		const textos = cabecalhos.map((th) => (th.textContent ?? "").toLowerCase());

		expect(textos).toContain("colaborador / e-mail");
		expect(textos).toContain("perfil");
		expect(textos).toContain("subfunção");
		expect(textos).toContain("status");
		expect(textos).toContain("data");

		expect(await screen.findByText("Mariana Costa")).toBeInTheDocument();
		expect(screen.getByText("PENDENTE")).toBeInTheDocument();
		expect(screen.getByText("Felipe Santos")).toBeInTheDocument();
		expect(screen.getByText("BLOQUEADO")).toBeInTheDocument();
		expect(screen.getByText("PENDENTE").closest("tr")).toHaveClass(
			"bg-warning-50/70",
		);
		expect(screen.getByText("BLOQUEADO").closest("tr")).toHaveClass(
			"bg-brand-50/50",
		);
	});

	it("@spec:AC-023 quem não é administrador é levado ao dashboard", async () => {
		sessaoAtual.value = {
			userId: "user-seller",
			tenantId: "tenant-1",
			tenantName: "NetProfissional",
			name: "Rafael Nunes",
			email: "rafael.nunes@netprofissional.com.br",
			role: "USUARIO",
			operationalRole: "VENDEDOR",
		};

		renderRoute("/users");

		expect(
			await screen.findByRole("heading", {
				name: "Painel Operacional do Vendedor",
			}),
		).toBeInTheDocument();
		expect(screen.queryByText("Gestão de Usuários")).toBeNull();
	});

	it("@spec:AC-030 convida, edita e bloqueia com transferência obrigatória de leads", async () => {
		usarAdministrador();
		installStatefulUsersMock();
		renderRoute("/users");

		fireEvent.click(
			await screen.findByRole("button", { name: "+ Convidar por e-mail" }),
		);
		fireEvent.change(screen.getByLabelText("Nome completo"), {
			target: { value: "João Vendedor" },
		});
		fireEvent.change(screen.getByLabelText("E-mail corporativo"), {
			target: { value: "joao@netprofissional.com.br" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));
		expect(await screen.findByText("João Vendedor")).toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent(
			"Convite enviado para joao@netprofissional.com.br",
		);

		fireEvent.click(
			screen.getByRole("button", { name: "Editar João Vendedor" }),
		);
		fireEvent.change(await screen.findByLabelText("Nome completo"), {
			target: { value: "João Silva" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
		expect(await screen.findByText("João Silva")).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", { name: "Bloquear Rafael Nunes" }),
		);
		const confirm = await screen.findByRole("button", {
			name: "Bloquear acesso",
		});
		expect(confirm).toBeDisabled();
		fireEvent.change(screen.getByLabelText("Transferir leads ativos para"), {
			target: { value: "user-captador" },
		});
		fireEvent.click(confirm);
		expect(await screen.findByRole("status")).toHaveTextContent(
			"leads transferidos",
		);
		const rafaelRow = screen.getByText("Rafael Nunes").closest("tr");
		expect(rafaelRow).not.toBeNull();
		if (rafaelRow) {
			expect(within(rafaelRow).getByText("BLOQUEADO")).toBeInTheDocument();
		}
	});

	it("@spec:AC-165 a lista vem de GET /users com situação e papel", async () => {
		usarAdministrador();
		const api = installApiMock();
		renderRoute("/users");

		expect(await screen.findByText("Mariana Costa")).toBeInTheDocument();
		expect(screen.getByText("Rafael Nunes")).toBeInTheDocument();
		expect(screen.getByText("Juliana Prado")).toBeInTheDocument();
		expect(screen.getByText("Felipe Santos")).toBeInTheDocument();

		// Situação traduzida do enum da API.
		expect(screen.getAllByText("ATIVO").length).toBe(3);
		expect(screen.getByText("PENDENTE")).toBeInTheDocument();
		expect(screen.getByText("BLOQUEADO")).toBeInTheDocument();

		// Papel operacional da API.
		expect(screen.getByText("CAPTADOR")).toBeInTheDocument();
		expect(screen.getAllByText("VENDEDOR").length).toBeGreaterThanOrEqual(3);

		const listagem = api.calls.find(
			(call) => call.method === "GET" && call.path === "/users",
		);
		expect(listagem).toBeDefined();
		expect(listagem?.url.searchParams.get("limit")).toBe("20");
	});

	it("@spec:AC-166 o convite chama POST /users/invite e recarrega a lista", async () => {
		usarAdministrador();
		const api = installApiMock();
		renderRoute("/users");
		await screen.findByText("Mariana Costa");

		fireEvent.click(
			screen.getByRole("button", { name: "+ Convidar por e-mail" }),
		);
		fireEvent.change(screen.getByLabelText("Nome completo"), {
			target: { value: "João Vendedor" },
		});
		fireEvent.change(screen.getByLabelText("E-mail corporativo"), {
			target: { value: "joao@netprofissional.com.br" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));

		expect(await screen.findByRole("status")).toHaveTextContent(
			"Convite enviado para joao@netprofissional.com.br",
		);

		const convite = api.calls.find(
			(call) => call.method === "POST" && call.path === "/users/invite",
		);
		expect(convite?.body).toEqual({
			name: "João Vendedor",
			email: "joao@netprofissional.com.br",
			operational_role: "VENDEDOR",
			role: "USUARIO",
		});

		const listagens = api.calls.filter(
			(call) => call.method === "GET" && call.path === "/users",
		);
		expect(listagens.length).toBeGreaterThanOrEqual(2);

		// E-mail já cadastrado: a mensagem de negócio vai para `role="alert"`.
		api.set("POST /users/invite", () => ({
			status: 409,
			body: {
				success: false,
				error: {
					code: "EMAIL_ALREADY_EXISTS",
					message: "E-mail já cadastrado.",
					timestamp: "2026-10-26T12:00:00.000Z",
				},
			},
		}));
		fireEvent.click(
			screen.getByRole("button", { name: "+ Convidar por e-mail" }),
		);
		fireEvent.change(screen.getByLabelText("Nome completo"), {
			target: { value: "Duplicado" },
		});
		fireEvent.change(screen.getByLabelText("E-mail corporativo"), {
			target: { value: "joao@netprofissional.com.br" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Enviar convite" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"já possui convite ou conta",
		);
		expect(
			screen.getByRole("dialog", { name: "Convidar colaborador" }),
		).toBeInTheDocument();
	});

	it("@spec:AC-187 o Admin convida os três perfis, confere situação pendente e encerra a sessão", async () => {
		usarAdministrador();
		const api = installStatefulUsersMock();
		renderRoute("/users");
		await screen.findByText("Mariana Costa");

		const convites = [
			{ nome: "Admin E2E", email: "admin.e2e@example.test", role: "ADMIN" },
			{
				nome: "Captador E2E",
				email: "captador.e2e@example.test",
				role: "CAPTADOR",
			},
			{
				nome: "Vendedor E2E",
				email: "vendedor.e2e@example.test",
				role: "VENDEDOR",
			},
		] as const;

		for (const convite of convites) {
			fireEvent.click(
				screen.getByRole("button", { name: "+ Convidar por e-mail" }),
			);
			const dialog = screen.getByRole("dialog", {
				name: "Convidar colaborador",
			});
			fireEvent.change(within(dialog).getByLabelText("Nome completo"), {
				target: { value: convite.nome },
			});
			fireEvent.change(within(dialog).getByLabelText("E-mail corporativo"), {
				target: { value: convite.email },
			});
			fireEvent.change(within(dialog).getByLabelText("Função operacional"), {
				target: { value: convite.role },
			});
			fireEvent.click(
				within(dialog).getByRole("button", { name: "Enviar convite" }),
			);

			expect(
				await screen.findByText(convite.nome, { exact: true }),
			).toBeInTheDocument();
			const row = screen.getByText(convite.email).closest("tr");
			expect(row).not.toBeNull();
			if (row) {
				expect(within(row).getByText("PENDENTE")).toBeInTheDocument();
				expect(within(row).getAllByText(convite.role).length).toBeGreaterThan(
					0,
				);
			}
		}

		const convitesEnviados = api.calls.filter(
			(call) => call.method === "POST" && call.path === "/users/invite",
		);
		expect(convitesEnviados.map((call) => call.body)).toEqual(
			convites.map((convite) => ({
				name: convite.nome,
				email: convite.email,
				operational_role: convite.role,
				role: convite.role === "ADMIN" ? "ADMIN" : "USUARIO",
			})),
		);

		fireEvent.click(screen.getByRole("button", { name: "Sair da conta" }));
		expect(
			await screen.findByRole("heading", { name: "Bem-vindo de volta" }),
		).toBeInTheDocument();
	});

	it("@spec:AC-167 a edição chama PATCH /users/{id} e recarrega a lista", async () => {
		usarAdministrador();
		const api = installApiMock();
		renderRoute("/users");
		await screen.findByText("Rafael Nunes");

		fireEvent.click(
			screen.getByRole("button", { name: "Editar Rafael Nunes" }),
		);
		fireEvent.change(await screen.findByLabelText("Nome completo"), {
			target: { value: "Rafael N. Silva" },
		});
		fireEvent.change(screen.getByLabelText("Função operacional"), {
			target: { value: "CAPTADOR" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

		expect(await screen.findByRole("status")).toHaveTextContent(
			"Dados de Rafael N. Silva atualizados",
		);

		const edicao = api.calls.find(
			(call) => call.method === "PATCH" && call.path === "/users/user-seller",
		);
		expect(edicao?.body).toMatchObject({
			name: "Rafael N. Silva",
			role: "USUARIO",
			operational_role: "CAPTADOR",
		});

		const listagens = api.calls.filter(
			(call) => call.method === "GET" && call.path === "/users",
		);
		expect(listagens.length).toBeGreaterThanOrEqual(2);
	});

	it("@spec:AC-168 @spec:AC-190 o bloqueio exige substituto e envia reassign_to_user_id", async () => {
		usarAdministrador();
		const api = installApiMock();
		renderRoute("/users");
		await screen.findByText("Rafael Nunes");

		fireEvent.click(
			screen.getByRole("button", { name: "Bloquear Rafael Nunes" }),
		);
		const confirmar = await screen.findByRole("button", {
			name: "Bloquear acesso",
		});
		expect(confirmar).toBeDisabled();

		fireEvent.change(screen.getByLabelText("Transferir leads ativos para"), {
			target: { value: "user-captador" },
		});
		expect(confirmar).toBeEnabled();

		fireEvent.click(confirmar);
		expect(await screen.findByRole("status")).toHaveTextContent(
			"Acesso de Rafael Nunes bloqueado",
		);

		const bloqueio = api.calls.find(
			(call) =>
				call.method === "POST" && call.path === "/users/user-seller/block",
		);
		expect(bloqueio?.body).toEqual({ reassign_to_user_id: "user-captador" });

		const listagens = api.calls.filter(
			(call) => call.method === "GET" && call.path === "/users",
		);
		expect(listagens.length).toBeGreaterThanOrEqual(2);
	});
});
