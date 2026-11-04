import { expect, test } from "@playwright/test";
import { loginAs } from "./support/login";
import { navTo } from "./support/nav";

/**
 * Jornada 2 — Cadastro Manual de Lead → disponibilização no Pool.
 *
 * O autopreenchimento por CNPJ usa a BrasilAPI (externa); para a suíte ser
 * determinística, o caminho principal cadastra à mão e confirma o lead no Pool.
 * A existência e o disparo do botão "Buscar CNPJ" são verificados sem depender
 * da resposta externa.
 */
test.describe("Jornada 2 — cadastro manual e Pool", () => {
	test("abre o formulário PJ/PF a partir do Pool", async ({ page }) => {
		await loginAs(page, "captador");
		await navTo(page, "Pool de Leads", /\/leads-pool/);

		await page
			.getByRole("button", { name: /novo lead \(manual \/ cnpj\)/i })
			.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog.getByText(/novo lead/i).first()).toBeVisible();
		await expect(dialog.getByRole("button", { name: /buscar cnpj/i })).toBeVisible();
	});

	test("cadastra um lead PJ manual e ele entra no Pool", async ({ page }) => {
		await loginAs(page, "vendedor1");
		await navTo(page, "Pool de Leads", /\/leads-pool/);

		await page
			.getByRole("button", { name: /novo lead \(manual \/ cnpj\)/i })
			.click();

		const dialog = page.getByRole("dialog");
		// CNPJ único por rodada para não colidir com a seed/duplicata.
		const cnpj = gerarCnpj();
		const razao = `Lead Manual E2E ${Date.now()}`;

		await dialog.getByLabel("CNPJ").fill(cnpj);
		await dialog.getByLabel("Razão social").fill(razao);

		// Contato mínimo para a captação ter nome.
		await dialog.getByLabel("Contato principal").fill("Contato E2E");

		await dialog.getByRole("button", { name: "Salvar lead" }).click();

		// O modal fecha no sucesso e a confirmação aparece no banner.
		await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });
		await expect(
			page.getByText(new RegExp(`${razao} foi incluído no Pool`, "i")),
		).toBeVisible({ timeout: 15_000 });
		// E a razão social aparece como linha na tabela do Pool.
		await expect(
			page.getByText(razao, { exact: true }),
		).toBeVisible({ timeout: 15_000 });
	});
});

/** Gera um CNPJ de 14 dígitos com dígitos verificadores válidos. */
function gerarCnpj(): string {
	const n = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
	const calc = (base: number[]) => {
		const pesos =
			base.length === 12
				? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
				: [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
		const soma = base.reduce((acc, d, i) => acc + d * pesos[i], 0);
		const resto = soma % 11;
		return resto < 2 ? 0 : 11 - resto;
	};
	const d1 = calc(n);
	const d2 = calc([...n, d1]);
	return [...n, d1, d2].join("");
}
