import { expect, test } from "./support/test";
import { loginAs } from "./support/login";
import { navTo } from "./support/nav";

test.describe("Usabilidade do Administrador", () => {
	test("@spec:AC-188 Admin atribui um lead do Pool a um Vendedor", async ({
		page,
	}) => {
		await loginAs(page, "admin");
		await navTo(page, "Pool de Leads", /\/leads-pool/);

		const lead = page
			.getByRole("button", { name: "👤 Atribuir Vendedor" })
			.first();
		await expect(lead).toBeVisible();
		await lead.click();

		const dialog = page.getByRole("dialog", {
			name: "Atribuir lead a vendedor",
		});
		await dialog
			.getByLabel("Vendedor responsável")
			.selectOption({ label: "Rafael Nunes" });
		await dialog.getByRole("button", { name: "Atribuir lead" }).click();

		await expect(
			page.getByRole("status").filter({ hasText: "foi atribuído a Rafael Nunes" }),
		).toBeVisible();
	});

	test("@spec:AC-189 Admin consulta o funil da equipe em Lista", async ({
		page,
	}) => {
		await loginAs(page, "admin");
		await navTo(page, "Funil de Vendas", /\/pipeline/);

		await expect(page).toHaveURL(/\/pipeline\?view=lista/);
		await expect(page.getByText("Visão da equipe · Lista")).toBeVisible();
		await expect(page.getByRole("button", { name: /Kanban/i })).toHaveCount(0);

		await page
			.getByLabel("Filtrar por vendedor")
			.selectOption({ label: "Rafael Nunes" });

		const abrirFicha = page.getByRole("button", { name: "Abrir ficha" }).first();
		await expect(abrirFicha).toBeVisible();
		await abrirFicha.click();
		await expect(page.getByRole("dialog")).toBeVisible();
	});

	test("@spec:AC-190 Admin bloqueia um Vendedor e transfere oportunidades", async ({
		page,
	}) => {
		await loginAs(page, "admin");
		await navTo(page, "Usuários & Permissões", /\/users/);

		await page
			.getByRole("button", { name: "Bloquear Rafael Nunes" })
			.click();
		const dialog = page.getByRole("dialog", {
			name: "Bloquear colaborador",
		});
		const bloquear = dialog.getByRole("button", { name: "Bloquear acesso" });
		await expect(bloquear).toBeDisabled();
		await dialog
			.getByLabel("Transferir leads ativos para")
			.selectOption({ label: "Diego Martins" });
		await bloquear.click();

		await expect(
			page.getByRole("status").filter({
				hasText:
					/Acesso de Rafael Nunes bloqueado.*leads transferidos.*Diego Martins/i,
			}),
		).toBeVisible();
		await expect(
			page.getByRole("row").filter({ hasText: "Rafael Nunes" }),
		).toContainText("BLOQUEADO");

		await navTo(page, "Funil de Vendas", /\/pipeline/);
		await page
			.getByLabel("Filtrar por vendedor")
			.selectOption({ label: "Diego Martins" });
		await expect(
			page.getByText("Solar Tech Engenharia LTDA"),
		).toBeVisible();
	});
});
