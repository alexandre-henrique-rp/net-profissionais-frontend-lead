import { expect, test } from "./support/test";
import { loginAs } from "./support/login";
import { navTo } from "./support/nav";

/**
 * Jornada 3 — Vendedor assume lead do Pool → movimenta no Kanban → edita o
 * ticket no Modal 1 (termos comerciais).
 *
 * Navegação pela UI (itens do menu lateral), ação "Assumir Lead" do Pool e o
 * seletor "Mover para…" do card, e o modal de termos ("Salvar valor").
 */
test.describe("Jornada 3 — assumir, mover e precificar", () => {
	test("@spec:AC-193 Vendedor assume um lead do Pool e o encontra na carteira", async ({ page }) => {
		await loginAs(page, "vendedor1");
		await navTo(page, "Pool de Leads", /\/leads-pool/);

		const assumir = page.getByRole("button", { name: /assumir lead/i }).first();
		await expect(assumir).toBeVisible({ timeout: 15_000 });
		const row = page.getByRole("row").filter({ has: assumir });
		const empresa = (
			await row.getByRole("cell").first().locator("p").first().innerText()
		).trim();
		await assumir.click();

		await expect(
			page.getByRole("status").filter({ hasText: `${empresa} foi assumido` }),
		).toBeVisible({ timeout: 15_000 });
		await navTo(page, "Meu Funil (Kanban)", /\/pipeline/);
		await expect(page.getByText(empresa, { exact: true })).toBeVisible();
	});

	test("@spec:AC-194 Vendedor abre Kanban com as sete etapas", async ({ page }) => {
		await loginAs(page, "vendedor1");
		// Clica "Meu Funil (Kanban)" no menu lateral.
		await navTo(page, "Meu Funil (Kanban)", /\/pipeline/);

		await expect(
			page.getByRole("heading", { name: /meu funil de vendas/i }),
		).toBeVisible();
		await expect(
			page.getByRole("button", {
				name: "Abrir Solar Tech Engenharia LTDA",
				exact: true,
			}),
		).toBeVisible();
		await expect(
			page.getByRole("button", {
				name: "Abrir Auto Peças Central LTDA",
				exact: true,
			}),
		).toHaveCount(0);
	});

	test("@spec:AC-196 Vendedor edita os termos comerciais da oportunidade", async ({
		page,
	}) => {
		await loginAs(page, "vendedor1");
		// Clica "Lista de Leads" no menu lateral.
		await navTo(page, "Lista de Leads", /\/pipeline/);

		// Na lista, "Abrir ficha" abre a gaveta; de lá, "Editar valor" abre o
		// Modal 1 de termos comerciais.
		await page.getByRole("button", { name: "Abrir ficha" }).first().click();

		const drawer = page.getByRole("dialog");
		await expect(drawer).toBeVisible({ timeout: 15_000 });
		await drawer.getByRole("button", { name: /editar valor/i }).click();

		// Modal de termos sobre a ficha.
		const termos = page
			.getByRole("dialog")
			.filter({ hasText: /termos comerciais/i });
		await expect(termos).toBeVisible();
		await termos.getByLabel("Ticket estimado (R$)").fill("12500");
		await termos.getByRole("button", { name: /salvar valor/i }).click();

		await expect(
			page.getByText(/valor da oportunidade atualizado/i),
		).toBeVisible({ timeout: 15_000 });
	});
});
