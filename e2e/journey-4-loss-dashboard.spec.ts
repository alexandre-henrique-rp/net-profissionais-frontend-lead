import { expect, test } from "./support/test";
import { loginAs } from "./support/login";
import { navTo } from "./support/nav";

/**
 * Jornada 4 — Vendedor marca uma oportunidade como Perdida exigindo motivo
 * (Modal 2) → o Administrador vê o dashboard com o indicador de perdas.
 *
 * O modal de perda ("Registrar motivo da perda") exige escolher um motivo
 * antes de encerrar; só então o envio é habilitado (AC-029).
 */
test.describe("Jornada 4 — perda com motivo e dashboard", () => {
	test("@spec:AC-197 Vendedor marca perda com motivo obrigatório", async ({ page }) => {
		await loginAs(page, "vendedor1");
		await navTo(page, "Meu Funil (Kanban)", /\/pipeline/);

		// Dispara a perda movendo um card para "7. Perdido" via "Mover para…".
		const mover = page
			.getByRole("combobox", { name: /mover .* para outra etapa/i })
			.first();
		await expect(mover).toBeVisible({ timeout: 15_000 });
		await mover.selectOption({ label: "7. Perdido" });

		const dialog = page.getByRole("dialog");
		await expect(
			dialog.getByText(/registrar motivo da perda/i),
		).toBeVisible();

		// Sem motivo, "Confirmar perda" fica desabilitado (AC-029).
		const encerrar = dialog.getByRole("button", { name: "Confirmar perda" });
		await expect(encerrar).toBeDisabled();

		// Ao escolher o motivo "Preço", habilita e registra.
		await dialog.getByRole("combobox").first().selectOption({ label: "Preço" });
		await expect(encerrar).toBeEnabled();
		await encerrar.click();

		await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });
		await expect(
			page.getByText(/marcado como perdido/i),
		).toBeVisible({ timeout: 15_000 });
	});

	test("admin vê o dashboard gerencial com indicadores", async ({ page }) => {
		await loginAs(page, "admin");
		await expect(
			page.getByRole("heading", { name: /dashboard gerencial/i }),
		).toBeVisible();

		// O dashboard do Admin apresenta blocos de conversão/receita/origem.
		await expect(
			page.getByText(/convers[ãa]o|receita|origem|perdid/i).first(),
		).toBeVisible({ timeout: 15_000 });
	});
});
