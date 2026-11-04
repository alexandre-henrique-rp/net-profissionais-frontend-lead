import { test } from "@playwright/test";

/**
 * Captura visual da tela de login para comparar com o board do Penpot
 * (Tela 01-L, 1440x900). Não é parte da homologação — é um utilitário de
 * inspeção. Rode com: yarn playwright test e2e/_capture-login.spec.ts
 */
test("captura da tela de login", async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto("/");
	await page.getByRole("heading", { name: /bem-vindo de volta/i }).waitFor();
	await page.screenshot({
		path: "/tmp/e2e-logs/login-real.png",
		fullPage: false,
	});
});
