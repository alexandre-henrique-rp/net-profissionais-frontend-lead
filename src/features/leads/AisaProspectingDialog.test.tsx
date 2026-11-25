import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { installApiMock } from "#/test/apiMock";
import { renderRoute } from "#/test/renderRoute";

describe("Prospecção de Leads com Aisa em /leads-pool", () => {
	it("@spec:AC-243 abre o modal pelo botão em /leads-pool com o acordeão fechado por padrão e carregado do banco", async () => {
		const api = installApiMock();
		renderRoute("/leads-pool");

		const trigger = await screen.findByRole("button", {
			name: "✨ Buscar Leads com Aisa",
		});
		fireEvent.click(trigger);

		const dialog = await screen.findByRole("dialog", {
			name: "Prospecção de Leads com Aisa",
		});
		expect(dialog).toBeInTheDocument();

		await waitFor(() => {
			expect(
				api.calls.some(
					(call) =>
						call.method === "GET" && call.path === "/integrations/aisa/config",
				),
			).toBe(true);
		});

		const details = dialog.querySelector("details");
		expect(details).not.toBeNull();
		expect(details).not.toHaveAttribute("open");
		expect(await within(dialog).findByText("Configurado")).toBeInTheDocument();
	});

	it("@spec:AC-244 permite expandir o acordeão, configurar provedor Customizado (URL + Token) e salvar no banco", async () => {
		const api = installApiMock();
		renderRoute("/leads-pool");

		fireEvent.click(
			await screen.findByRole("button", { name: "✨ Buscar Leads com Aisa" }),
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Prospecção de Leads com Aisa",
		});
		await within(dialog).findByText("Configurado");

		const summary = within(dialog).getByText(
			"Configurações de API (Aisa & Provedor de IA)",
		);
		fireEvent.click(summary);

		fireEvent.change(within(dialog).getByLabelText("Provedor de IA"), {
			target: { value: "CUSTOM" },
		});

		const urlInput = within(dialog).getByLabelText(
			/^URL do endpoint customizado/,
		);
		const tokenInput = within(dialog).getByLabelText(
			/^Chave \/ Token do provedor de IA/,
		);

		fireEvent.change(urlInput, {
			target: { value: "https://meu-llm.exemplo.com/v1/chat/completions" },
		});
		fireEvent.change(tokenInput, { target: { value: "tok-custom-999" } });
		fireEvent.change(within(dialog).getByLabelText(/^Chave da API Aisa/), {
			target: { value: "sk-aisa-nova-123" },
		});

		fireEvent.click(
			within(dialog).getByRole("button", { name: "Salvar configurações" }),
		);

		expect(
			await within(dialog).findByText(
				/Configurações salvas com segurança no banco de dados/,
			),
		).toBeInTheDocument();

		const putCall = api.calls.find(
			(call) =>
				call.method === "PUT" && call.path === "/integrations/aisa/config",
		);
		expect(putCall?.body).toMatchObject({
			aisa_api_key: "sk-aisa-nova-123",
			llm_provider: "CUSTOM",
			llm_api_key: "tok-custom-999",
			llm_base_url: "https://meu-llm.exemplo.com/v1/chat/completions",
		});
	});

	it("@spec:AC-245 pesquisa empresas por segmento/localização e importa selecionados para o Pool", async () => {
		const api = installApiMock();
		renderRoute("/leads-pool");

		fireEvent.click(
			await screen.findByRole("button", { name: "✨ Buscar Leads com Aisa" }),
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Prospecção de Leads com Aisa",
		});

		fireEvent.change(within(dialog).getByLabelText(/^Segmento \/ Nicho/), {
			target: { value: "Energia Solar" },
		});
		fireEvent.change(within(dialog).getByLabelText("Cidade"), {
			target: { value: "Belo Horizonte" },
		});
		fireEvent.change(within(dialog).getByLabelText("UF da pesquisa"), {
			target: { value: "MG" },
		});

		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "🔍 Buscar empresas com Aisa",
			}),
		);

		expect(
			await within(dialog).findByText("Helios Energia Solar LTDA"),
		).toBeInTheDocument();

		const searchCall = api.calls.find(
			(call) =>
				call.method === "POST" && call.path === "/integrations/aisa/search",
		);
		expect(searchCall?.body).toMatchObject({
			segment: "Energia Solar",
			city: "Belo Horizonte",
			state: "MG",
		});

		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Importar selecionados (1)",
			}),
		);

		expect(
			await within(dialog).findByText(/1 lead\(s\) importado\(s\) para o Pool/),
		).toBeInTheDocument();

		const importCall = api.calls.find(
			(call) =>
				call.method === "POST" && call.path === "/integrations/aisa/import",
		);
		expect(importCall?.body).toMatchObject({
			custom_sector: "Energia Solar",
			leads: [
				expect.objectContaining({
					company_name: "Helios Energia Solar LTDA",
					cnpj: "11222333000144",
				}),
			],
		});
	});
});
