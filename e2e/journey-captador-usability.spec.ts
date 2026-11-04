import { expect, test } from "./support/test";
import { loginAs } from "./support/login";
import { navTo } from "./support/nav";

test.describe("Usabilidade do Captador", () => {
	test("@spec:AC-208 Captador consulta seu dashboard", async ({ page }) => {
		await loginAs(page, "captador");
		await navTo(page, "Dashboard do Captador", /\/dashboard/);

		await expect(
			page.getByRole("heading", {
				name: "Dashboard de Produtividade do Captador",
			}),
		).toBeVisible();
		await expect(page.getByText("LEADS CAPTADOS POR VOCÊ")).toBeVisible();
		await expect(page.getByText("Status dos seus leads no funil")).toBeVisible();
	});

	test("@spec:AC-209 Captador acompanha a esteira sem ações de assumir", async ({
		page,
	}) => {
		await loginAs(page, "captador");
		await navTo(page, "Pool de Leads", /\/leads-pool/);

		await expect(
			page.getByRole("heading", { name: "Esteira de Captações" }),
		).toBeVisible();

		const esteira = page.getByRole("table");
		await expect(
			esteira.getByRole("columnheader", { name: "Vendedor responsável" }),
		).toBeVisible();
		await expect(
			esteira.getByRole("columnheader", { name: "Etapa atual" }),
		).toBeVisible();
		await expect(
			esteira.getByRole("row").filter({ hasText: "Solar Tech Engenharia" }),
		).toBeVisible();

		await expect(
			page.getByRole("button", { name: /Assumir/i }),
		).toHaveCount(0);
		await expect(
			page.getByRole("button", { name: /Atribuir/i }),
		).toHaveCount(0);
		await expect(page.getByLabel("Buscar leads")).toHaveCount(0);
	});

	test("@spec:AC-210 Captador cadastra um lead manual", async ({ page }) => {
		await loginAs(page, "captador");
		await navTo(page, "Novo Lead (Busca CNPJ)", /\/leads-pool/);

		const dialog = page.getByRole("dialog", { name: "Novo lead" });
		await expect(dialog).toBeVisible();

		const empresa = `Captação E2E ${Date.now()} LTDA`;
		await dialog.getByLabel("CNPJ").fill("12.345.678/0001-90");
		await dialog.getByLabel("Razão social").fill(empresa);
		await dialog.getByLabel("Cidade").fill("Contagem");
		await dialog.getByLabel("UF").fill("MG");
		await dialog.getByLabel("Contato principal").fill("João Lima");
		await dialog.getByRole("button", { name: "Salvar lead" }).click();

		await expect(dialog).toBeHidden();

		const esteira = page.getByRole("table");
		await expect(
			esteira.getByRole("row").filter({ hasText: empresa }),
		).toBeVisible();
		await expect(
			esteira.getByRole("row").filter({ hasText: empresa }),
		).toContainText("Sem vendedor");
	});

	test("@spec:AC-211 Menu do Captador mostra apenas funções do perfil", async ({
		page,
	}) => {
		await loginAs(page, "captador");

		await expect(
			page.getByRole("link", { name: "Dashboard do Captador" }),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Pool de Leads" }),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Novo Lead (Busca CNPJ)" }),
		).toBeVisible();

		await expect(
			page.getByRole("link", { name: "Funil de Vendas" }),
		).toHaveCount(0);
		await expect(
			page.getByRole("link", { name: "Meu Funil (Kanban)" }),
		).toHaveCount(0);
		await expect(page.getByRole("link", { name: "Lista de Leads" })).toHaveCount(
			0,
		);
		await expect(
			page.getByRole("link", { name: "Usuários & Permissões" }),
		).toHaveCount(0);
	});
});
