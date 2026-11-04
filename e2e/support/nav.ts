import { expect, type Page } from "@playwright/test";

/**
 * Navega clicando no item do menu lateral (como um usuário faria), em vez de
 * `page.goto`. Confirma que a tela carregou esperando a URL alvo.
 */
export async function navTo(
	page: Page,
	menuLabel: string | RegExp,
	expectedUrl: RegExp,
): Promise<void> {
	await page.getByRole("link", { name: menuLabel }).first().click();
	await expect(page).toHaveURL(expectedUrl, { timeout: 15_000 });
}

/**
 * Confirma, de forma explícita, que a tela carregou: espera um heading visível.
 * Usado no começo de cada verificação de tela para a "certeza de carregamento".
 */
export async function esperarTela(
	page: Page,
	headingPattern: RegExp,
): Promise<void> {
	await expect(
		page.getByRole("heading", { name: headingPattern }).first(),
	).toBeVisible({ timeout: 15_000 });
}
