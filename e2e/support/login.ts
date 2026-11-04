import { expect, type Page } from "@playwright/test";
import { type AccountKey, accounts } from "./accounts";

/**
 * Faz login pela interface real (POST /auth/login grava o cookie np_session) e
 * espera cair no dashboard. Usa rótulos acessíveis, sem data-testid.
 */
export async function loginAs(page: Page, who: AccountKey): Promise<void> {
	const { email, password } = accounts[who];

	// Open the app entry point; the anonymous-session guard takes us to login.
	await page.goto("/");
	await page.getByLabel("E-mail Corporativo").fill(email);
	await page.getByLabel("Senha de Acesso").fill(password);
	await page.getByRole("button", { name: /entrar no painel/i }).click();

	await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}
