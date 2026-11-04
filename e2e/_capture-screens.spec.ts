import { test } from "@playwright/test";
import { loginAs } from "./support/login";
import { navTo } from "./support/nav";

/**
 * Capturas visuais das telas autenticadas para comparar com os boards do Penpot.
 * Utilitário de inspeção (não é homologação). 1440x900 = dimensão dos boards.
 */
test.use({ viewport: { width: 1440, height: 900 } });

test("captura dashboard admin", async ({ page }) => {
	await loginAs(page, "admin");
	await page.getByRole("heading", { name: /dashboard gerencial/i }).waitFor();
	await page.waitForTimeout(800);
	await page.screenshot({ path: "/tmp/e2e-logs/real-dashboard-admin.png" });
});

test("captura usuarios", async ({ page }) => {
	await loginAs(page, "admin");
	await navTo(page, "Usuários & Permissões", /\/users/);
	await page.getByRole("heading", { name: /gest[ãa]o de usu[áa]rios/i }).waitFor();
	await page.waitForTimeout(800);
	await page.screenshot({ path: "/tmp/e2e-logs/real-users.png" });
});

test("captura pool", async ({ page }) => {
	await loginAs(page, "vendedor1");
	await navTo(page, "Pool de Leads", /\/leads-pool/);
	await page.getByRole("heading", { name: /pool de leads/i }).waitFor();
	await page.waitForTimeout(800);
	await page.screenshot({ path: "/tmp/e2e-logs/real-pool.png" });
});

test("captura pipeline kanban", async ({ page }) => {
	await loginAs(page, "vendedor1");
	await navTo(page, "Meu Funil (Kanban)", /\/pipeline/);
	await page.getByRole("heading", { name: /meu funil de vendas/i }).waitFor();
	await page.waitForTimeout(800);
	await page.screenshot({ path: "/tmp/e2e-logs/real-pipeline-kanban.png" });
});
