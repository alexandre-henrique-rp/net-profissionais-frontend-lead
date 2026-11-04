import { expect, test } from "./support/test";
import { accounts } from "./support/accounts";
import { requireSecret, SEED_PASSWORD } from "./support/env";
import { loginAs } from "./support/login";
import { navTo } from "./support/nav";

/**
 * Jornada 1 — Login do Administrador → Convidar Colaborador → Ativação de Senha.
 *
 * Cobre a recusa de conta bloqueada, o login válido do Admin, o envio de
 * convite pela tela de usuários e a ativação da conta pendente com o token da
 * seed (SEED_E2E_INVITE_TOKEN).
 */
test.describe("Jornada 1 — autenticação, convite e ativação", () => {
	test("conta bloqueada não entra", async ({ page }) => {
		await page.goto("/");
		await page.getByLabel("E-mail Corporativo").fill(accounts.bloqueado.email);
		await page.getByLabel("Senha de Acesso").fill(SEED_PASSWORD);
		await page.getByRole("button", { name: /entrar no painel/i }).click();

		await expect(page.getByRole("alert")).toBeVisible();
		await expect(page).toHaveURL(/\/login/);
	});

	test("admin entra e vê o dashboard gerencial", async ({ page }) => {
		await loginAs(page, "admin");
		await expect(
			page.getByRole("heading", { name: /dashboard gerencial/i }),
		).toBeVisible();
	});

	test("@spec:AC-187 Admin convida os três perfis e encerra a sessão", async ({ page }) => {
		await loginAs(page, "admin");
		// Navega pela UI: clica "Usuários & Permissões" no menu lateral.
		await navTo(page, "Usuários & Permissões", /\/users/);
		await expect(
			page.getByRole("heading", { name: /gest[ãa]o de usu[áa]rios/i }),
		).toBeVisible();

		const rodada = Date.now();
		const convites = [
			{
				name: "Admin Usabilidade E2E",
				email: `admin.${rodada}@e2e.netprofissional.test`,
				role: "ADMIN",
			},
			{
				name: "Captador Usabilidade E2E",
				email: `captador.${rodada}@e2e.netprofissional.test`,
				role: "CAPTADOR",
			},
			{
				name: "Vendedor Usabilidade E2E",
				email: `vendedor.${rodada}@e2e.netprofissional.test`,
				role: "VENDEDOR",
			},
		] as const;

		for (const convite of convites) {
			await page.getByRole("button", { name: /convidar por e-mail/i }).click();
			const dialog = page.getByRole("dialog", {
				name: /convidar colaborador/i,
			});
			await dialog.getByLabel("Nome completo").fill(convite.name);
			await dialog.getByLabel("E-mail corporativo").fill(convite.email);
			await dialog
				.getByLabel("Função operacional")
				.selectOption(convite.role);
			await dialog.getByRole("button", { name: "Enviar convite" }).click();

			await expect(
				page.getByText(new RegExp(`convite enviado para ${convite.email}`, "i")),
			).toBeVisible({ timeout: 15_000 });
			const row = page.getByRole("row").filter({ hasText: convite.email });
			await expect(row).toContainText("PENDENTE");
			await expect(row).toContainText(convite.role);
		}

		await page.getByRole("button", { name: "Sair da conta" }).click();
		await expect(page.getByLabel("E-mail Corporativo")).toBeVisible();
	});

	test("ativação por token habilita a nova senha", async ({ page }) => {
		const token = requireSecret("invite");
		await page.goto(`/ativar-conta?token=${encodeURIComponent(token)}`);

		await expect(
			page.getByRole("heading", { name: /ativar|ativa[çc][ãa]o/i }),
		).toBeVisible();

		// A tela mostra os critérios da senha e só habilita o envio quando ela é
		// válida e confirmada (AC-025, provado no unitário; aqui validamos o fluxo).
		const senha = `${SEED_PASSWORD}X9`;
		await page.getByLabel(/nova senha/i).first().fill(senha);
		const confirm = page.getByLabel(/confirm/i).first();
		if (await confirm.count()) {
			await confirm.fill(senha);
		}

		const enviar = page.getByRole("button", { name: /ativar|definir senha|concluir/i }).first();
		await expect(enviar).toBeEnabled();
	});
});
