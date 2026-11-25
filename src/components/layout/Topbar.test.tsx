import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "#/test/renderRoute";

describe("topbar da aplicação", () => {
	it("@spec:AC-017 tem busca global com atalho, ação de novo lead, tema e corporação", async () => {
		renderRoute("/leads-pool");

		const busca = await screen.findByPlaceholderText(/Ctrl\+K/);
		expect(busca).toHaveAttribute("type", "search");

		expect(
			screen.getByRole("button", { name: "+ Novo Lead" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "☀️ Light" })).toBeInTheDocument();
		expect(screen.getByText(/Corporação: NetProfissional/)).toBeInTheDocument();
	});

	it("@spec:AC-018 o perfil mostra as iniciais, o nome e o papel", async () => {
		renderRoute("/leads-pool");

		// O nome aparece duas vezes de propósito: cartão da sidebar e perfil da topbar.
		const nomes = await screen.findAllByText("Alexandre Henrique");
		expect(nomes).toHaveLength(2);

		expect(screen.getAllByText("AH")).toHaveLength(2);
		expect(screen.getAllByText(/● Administrador Geral/)).toHaveLength(2);
	});

	it("o botão + Novo Lead abre o mesmo formulário de cadastro do Pool", async () => {
		renderRoute("/leads-pool");

		fireEvent.click(await screen.findByRole("button", { name: "+ Novo Lead" }));

		expect(
			await screen.findByRole("dialog", { name: "Novo lead" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("CNPJ")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "🔍 Buscar CNPJ" }),
		).toBeInTheDocument();
	});

	it("alterna o tema entre claro e escuro ao clicar no botão da topbar", async () => {
		renderRoute("/leads-pool");

		const lightButton = await screen.findByRole("button", { name: "☀️ Light" });
		expect(lightButton).toHaveAttribute("aria-pressed", "false");

		fireEvent.click(lightButton);

		const darkButton = await screen.findByRole("button", { name: "🌙 Dark" });
		expect(darkButton).toHaveAttribute("aria-pressed", "true");
		expect(
			document.head
				.querySelector('meta[name="color-scheme"]')
				?.getAttribute("content"),
		).toBe("dark");

		fireEvent.click(darkButton);

		expect(
			await screen.findByRole("button", { name: "☀️ Light" }),
		).toHaveAttribute("aria-pressed", "false");
		expect(
			document.head
				.querySelector('meta[name="color-scheme"]')
				?.getAttribute("content"),
		).toBe("light dark");
	});
});
