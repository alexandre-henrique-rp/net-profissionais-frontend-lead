import { expect, test } from "./support/test";
import { loginAs } from "./support/login";
import { navTo } from "./support/nav";

test.describe("Usabilidade do Vendedor", () => {
	test("@spec:AC-192 Vendedor consulta seu dashboard", async ({ page }) => {
		await loginAs(page, "vendedor1");
		await navTo(page, "Dashboard do Vendedor", /\/dashboard/);

		await expect(
			page.getByRole("heading", { name: "Painel Operacional do Vendedor" }),
		).toBeVisible();
		await expect(page.getByText("Solar Tech Engenharia")).toBeVisible();
	});

	test("@spec:AC-194 Vendedor abre a Lista da própria carteira", async ({
		page,
	}) => {
		await loginAs(page, "vendedor1");
		await navTo(page, "Lista de Leads", /\/pipeline/);

		await expect(page).toHaveURL(/\/pipeline\?view=lista/);
		const carteira = page.getByRole("table");
		await expect(
			carteira.getByRole("row").filter({ hasText: "Solar Tech Engenharia" }),
		).toBeVisible();
		await expect(carteira.getByText("Auto Peças Central LTDA")).toHaveCount(0);
	});

	test("@spec:AC-195 Vendedor move Solar Tech para Reunião", async ({
		page,
	}) => {
		await loginAs(page, "vendedor1");
		await navTo(page, "Meu Funil (Kanban)", /\/pipeline/);

		const mover = page.getByLabel(
			"Mover Solar Tech Engenharia LTDA para outra etapa",
		);
		await mover.selectOption({ label: "3. Apresentação / Reunião" });
		await expect(
			page.getByText("Oportunidade movida para 3. Apresentação / Reunião."),
		).toBeVisible();
	});

	test("@spec:AC-198 Vendedor registra uma nota na linha do tempo", async ({
		page,
	}) => {
		await loginAs(page, "vendedor1");
		await navTo(page, "Lista de Leads", /\/pipeline/);

		const solar = page
			.getByRole("row")
			.filter({ hasText: "Solar Tech Engenharia" });
		await solar.getByRole("button", { name: "Abrir ficha" }).click();
		const ficha = page.getByRole("dialog");
		const nota = `Nota do vendedor ${Date.now()}`;
		await ficha.getByLabel("Registrar uma nota").fill(nota);
		await ficha.getByRole("button", { name: "Salvar nota" }).click();

		await expect(ficha.getByText(nota, { exact: true })).toBeVisible();
	});

	test("@spec:AC-199 Vendedor devolve Solar Tech ao Pool", async ({ page }) => {
		await loginAs(page, "vendedor1");
		await navTo(page, "Lista de Leads", /\/pipeline/);

		const solar = page
			.getByRole("row")
			.filter({ hasText: "Solar Tech Engenharia" });
		await solar.getByRole("button", { name: "Abrir ficha" }).click();
		await page.getByRole("dialog").getByRole("button", {
			name: "Devolver ao pool",
		}).click();

		await expect(
			page.getByRole("status").filter({
				hasText: "Solar Tech Engenharia LTDA foi devolvido ao pool de leads",
			}),
		).toBeVisible();
		await navTo(page, "Pool de Leads", /\/leads-pool/);

		const leadDevolvido = page
			.getByRole("row")
			.filter({ hasText: "Solar Tech Engenharia LTDA" });
		await expect(
			leadDevolvido.getByRole("button", { name: /Assumir Lead/i }),
		).toBeVisible();
	});
});
