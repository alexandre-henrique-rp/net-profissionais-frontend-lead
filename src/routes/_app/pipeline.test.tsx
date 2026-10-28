import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	installApiMock,
	LEAD_DETAIL,
	mockFailures,
	PIPELINE,
} from "#/test/apiMock";
import { renderRoute } from "#/test/renderRoute";

const testRole = vi.hoisted(() => ({ current: "VENDEDOR" }));

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

function pipelineCalls(api: ReturnType<typeof installApiMock>) {
	return api.calls.filter(
		(call) => call.method === "GET" && call.path === "/leads/pipeline",
	);
}

async function abrirSolar() {
	fireEvent.click(
		await screen.findByRole("button", {
			name: "Abrir Solar Tech Engenharia",
		}),
	);
	await screen.findByRole("dialog", { name: "Solar Tech Engenharia" });
	// Espera a ficha chegar: só então os campos existem.
	await screen.findByRole("button", { name: "Editar valor" });
}

describe("funil de vendas", () => {
	beforeEach(() => {
		testRole.current = "VENDEDOR";
	});

	it("@spec:AC-022 por padrão abre em Kanban com as 7 etapas", async () => {
		installApiMock();
		renderRoute("/pipeline");

		expect(
			await screen.findByRole("heading", {
				name: "1. Novo Lead / Recebido",
			}),
		).toBeInTheDocument();

		for (let etapa = 1; etapa <= 7; etapa += 1) {
			expect(
				screen.getByRole("heading", { name: new RegExp(`^${etapa}\\.`) }),
			).toBeInTheDocument();
		}
	});

	it("@spec:AC-022 a visão Lista aparece quando a URL pede view=lista", async () => {
		installApiMock();
		renderRoute("/pipeline?view=lista");

		const cabecalhos = await screen.findAllByRole("columnheader");
		const textos = cabecalhos.map((th) => th.textContent ?? "");

		expect(textos[0]).toContain("Cliente");
		expect(textos[1]).toContain("Localização");
		expect(textos[2]).toContain("Ticket");
		expect(textos[3]).toContain("Etapa");
		expect(textos[4]).toContain("Vendedor");
		expect(screen.queryByRole("heading", { name: /^1\./ })).toBeNull();
	});

	it("@spec:AC-022 a visão Lista carrega os leads de todas as etapas", async () => {
		installApiMock();
		renderRoute("/pipeline?view=lista");

		expect(
			await screen.findByText("Solar Tech Engenharia"),
		).toBeInTheDocument();
		expect(screen.getByText("Indústria Química Horizonte")).toBeInTheDocument();
		expect(screen.getByText("Clínica Vida Plena")).toBeInTheDocument();
		expect(screen.getByText("Metalúrgica São Jorge")).toBeInTheDocument();
	});

	it("@spec:AC-157 o Kanban desenha as 7 colunas e os cards da API, com alerta e ticket", async () => {
		installApiMock();
		renderRoute("/pipeline");

		const solar = await screen.findByRole("button", {
			name: "Abrir Solar Tech Engenharia",
		});
		expect(within(solar).getByText("R$ 42.000,00")).toBeInTheDocument();

		// O card da Química Horizonte vem com `has_alert: true` da fixture.
		const alerta = await screen.findByRole("button", {
			name: "Abrir Indústria Química Horizonte",
		});
		expect(
			within(alerta).getByText("🚨 Alerta de inatividade"),
		).toBeInTheDocument();

		const colunas = screen.getAllByRole("heading", { level: 2 });
		expect(colunas).toHaveLength(7);
	});

	it("@spec:AC-158 mover o card chama PATCH /leads/{id}/stage com stage_id e version", async () => {
		const api = installApiMock();
		renderRoute("/pipeline");

		const mover = await screen.findByLabelText(
			"Mover Solar Tech Engenharia para outra etapa",
		);
		fireEvent.change(mover, { target: { value: PIPELINE.stages[1].stage.id } });

		await waitFor(() => {
			const chamada = api.calls.find(
				(call) =>
					call.method === "PATCH" && call.path === "/leads/tenant-lead-1/stage",
			);
			expect(chamada).toBeDefined();
			expect(chamada?.body).toMatchObject({
				stage_id: PIPELINE.stages[1].stage.id,
				version: 3,
			});
		});
		expect(
			await screen.findByText(/Oportunidade movida para 2\. Qualificação/),
		).toBeInTheDocument();
	});

	it("@spec:AC-159 conflito de versão avisa e recarrega o funil", async () => {
		const api = installApiMock({
			"PATCH /leads/:id/stage": () =>
				mockFailures.conflict(
					"VERSION_CONFLICT",
					"O card foi alterado por outra pessoa.",
				),
		});
		renderRoute("/pipeline");

		await screen.findByRole("button", { name: "Abrir Solar Tech Engenharia" });
		const antes = pipelineCalls(api).length;

		fireEvent.change(
			screen.getByLabelText("Mover Solar Tech Engenharia para outra etapa"),
			{ target: { value: PIPELINE.stages[1].stage.id } },
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			/Outra pessoa alterou esta oportunidade/,
		);
		await waitFor(() => {
			expect(pipelineCalls(api).length).toBeGreaterThan(antes);
		});
	});

	it("@spec:AC-028 abre a gaveta do lead e registra uma nota na linha do tempo", async () => {
		installApiMock();
		renderRoute("/pipeline");
		await abrirSolar();

		fireEvent.change(screen.getByLabelText("Registrar uma nota"), {
			target: { value: "Enviar proposta revisada na sexta-feira." },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar nota" }));
		expect(
			await screen.findByText("Enviar proposta revisada na sexta-feira."),
		).toBeInTheDocument();
	});

	it("@spec:AC-029 atualiza o ticket e exige motivo antes de marcar a oportunidade como perdida", async () => {
		installApiMock();
		renderRoute("/pipeline");
		await abrirSolar();

		fireEvent.click(screen.getByRole("button", { name: "Editar valor" }));
		fireEvent.change(screen.getByLabelText("Ticket estimado (R$)"), {
			target: { value: "60000" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar valor" }));
		expect(
			await screen.findByText(/Valor da oportunidade atualizado/),
		).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", { name: "Marcar como perdido" }),
		);
		expect(
			await screen.findByRole("button", { name: "Confirmar perda" }),
		).toBeDisabled();
		fireEvent.change(screen.getByLabelText("Motivo da perda"), {
			target: { value: "concorrencia" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Confirmar perda" }));
		expect(await screen.findByText(/motivo registrado/)).toBeInTheDocument();
	});

	it("@spec:AC-160 salvar os termos comerciais chama PUT /leads/{id}/commercial-terms", async () => {
		const api = installApiMock();
		renderRoute("/pipeline");
		await abrirSolar();

		fireEvent.click(screen.getByRole("button", { name: "Editar valor" }));
		fireEvent.change(screen.getByLabelText("Ticket estimado (R$)"), {
			target: { value: "60000" },
		});
		fireEvent.change(screen.getByLabelText(/Probabilidade de fechamento/), {
			target: { value: "75" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar valor" }));

		await waitFor(() => {
			const chamada = api.calls.find(
				(call) =>
					call.method === "PUT" &&
					call.path === "/leads/tenant-lead-1/commercial-terms",
			);
			expect(chamada?.body).toMatchObject({
				ticket_value: 60000,
				close_probability: 75,
			});
		});
	});

	it("@spec:AC-161 confirmar a perda chama POST /leads/{id}/mark-as-lost com o motivo", async () => {
		const api = installApiMock();
		renderRoute("/pipeline");
		await abrirSolar();

		fireEvent.click(
			screen.getByRole("button", { name: "Marcar como perdido" }),
		);
		fireEvent.change(screen.getByLabelText("Motivo da perda"), {
			target: { value: "concorrencia" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Confirmar perda" }));

		await waitFor(() => {
			const chamada = api.calls.find(
				(call) =>
					call.method === "POST" &&
					call.path === "/leads/tenant-lead-1/mark-as-lost",
			);
			expect(chamada?.body).toMatchObject({
				loss_reason_code: "concorrencia",
			});
		});
		expect(await screen.findByText(/motivo registrado/)).toBeInTheDocument();
	});

	it("@spec:AC-162 a gaveta carrega GET /leads/{id} com contato, data especial e timeline", async () => {
		const api = installApiMock();
		renderRoute("/pipeline");
		await abrirSolar();

		expect(
			await screen.findByText("Marcelo Dias (Decisor)"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Aniversário do decisor em 14/11"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Cliente pediu proposta revisada."),
		).toBeInTheDocument();
		expect(
			api.calls.some(
				(call) => call.method === "GET" && call.path === "/leads/tenant-lead-1",
			),
		).toBe(true);
	});

	it("@spec:AC-163 salvar uma nota chama POST /leads/{id}/timeline-notes e mostra a nota", async () => {
		const api = installApiMock();
		renderRoute("/pipeline");
		await abrirSolar();

		fireEvent.change(screen.getByLabelText("Registrar uma nota"), {
			target: { value: "Reunião confirmada para segunda-feira." },
		});
		fireEvent.click(screen.getByRole("button", { name: "Salvar nota" }));

		await waitFor(() => {
			const chamada = api.calls.find(
				(call) =>
					call.method === "POST" &&
					call.path === "/leads/tenant-lead-1/timeline-notes",
			);
			expect(chamada?.body).toMatchObject({
				type: "NOTE",
				content: "Reunião confirmada para segunda-feira.",
			});
		});
		expect(
			await screen.findByText("Reunião confirmada para segunda-feira."),
		).toBeInTheDocument();
	});

	it("@spec:AC-036 card e ficha mostram data especial, WhatsApp e devolução ao pool", async () => {
		renderRoute("/pipeline");
		await abrirSolar();

		expect(await screen.findByText(/CNPJ: 33456789000102/)).toBeInTheDocument();
		expect(
			screen.getByText("Aniversário do decisor em 14/11"),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "WhatsApp Web" })).toHaveAttribute(
			"href",
			LEAD_DETAIL.contacts[0].whatsapp_url,
		);

		fireEvent.click(screen.getByRole("button", { name: "Devolver ao pool" }));
		expect(
			await screen.findByText(/foi devolvido ao pool de leads/),
		).toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("@spec:AC-164 devolver ao pool chama POST /leads/{id}/unlink e fecha a gaveta", async () => {
		const api = installApiMock();
		renderRoute("/pipeline");
		await abrirSolar();

		fireEvent.click(screen.getByRole("button", { name: "Devolver ao pool" }));

		await waitFor(() => {
			expect(
				api.calls.some(
					(call) =>
						call.method === "POST" &&
						call.path === "/leads/tenant-lead-1/unlink",
				),
			).toBe(true);
		});
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});

	it("@spec:AC-034 mantém o Administrador na Lista agrupada com os filtros de equipe", async () => {
		testRole.current = "ADMIN";
		installApiMock();
		renderRoute("/pipeline");

		expect(
			await screen.findByText("Visão da equipe · Lista"),
		).toBeInTheDocument();
		expect(
			await screen.findByLabelText("Filtrar por vendedor"),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Filtrar por cidade")).toBeInTheDocument();
		expect(screen.getByLabelText("Ticket mínimo (R$)")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /1\. Novo Lead/ }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: /^1\./ }),
		).not.toBeInTheDocument();
	});

	it("@spec:AC-034 redireciona Captador para o dashboard sem abrir o funil", async () => {
		testRole.current = "CAPTADOR";
		installApiMock();
		renderRoute("/pipeline");

		expect(
			await screen.findByRole("heading", {
				name: "Dashboard de Produtividade do Captador",
			}),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: /^1\./ }),
		).not.toBeInTheDocument();
	});
});
