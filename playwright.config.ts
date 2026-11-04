import { defineConfig, devices } from "@playwright/test";
import { API_URL } from "./e2e/support/env";

/**
 * Homologação E2E (TASK-S06-06) — NetProfissional.
 *
 * Pré-requisitos ANTES de `yarn e2e` (ver backend/prisma/SEED-E2E.md):
 *   1. Postgres e Redis no ar e `backend/.env` preenchido.
 *   2. `cd backend && yarn prisma:deploy` (aplica as migrations).
 *
 * O runner usa `PORT` de backend/.env para apontar a checagem de saúde e VITE_API_URL.
 *
 * O `webServer` sobe o backend e o frontend. A URL da API acompanha `PORT` no
 * backend/.env (ou pode ser substituída por `E2E_API_URL`).
 *
 * As telas usam rótulos acessíveis (sem data-testid): prefira getByRole/getByLabel.
 */

const FRONTEND_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const API_BASE_URL = API_URL.replace(/\/+$/, "");

export default defineConfig({
	testDir: "./e2e",
	// Sequencial: as jornadas compartilham o mesmo tenant de homologação e a
	// seed garante o estado inicial no começo da suíte (globalSetup).
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI
		? [["github"], ["html", { open: "never" }], ["list"]]
		: [["list"], ["html", { open: "never" }]],
	globalSetup: "./e2e/global-setup.ts",
	timeout: 60_000,
	expect: { timeout: 10_000 },
	use: {
		baseURL: FRONTEND_URL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: process.env.E2E_RECORD_VIDEO === "1" ? "on" : "retain-on-failure",
		// Câmera lenta opcional para acompanhar os cliques a olho nu.
		// Ative com: E2E_SLOWMO=600 yarn e2e:headed
		launchOptions: {
			slowMo: process.env.E2E_SLOWMO ? Number(process.env.E2E_SLOWMO) : 0,
		},
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: [
		{
			// `yarn start` carrega backend/.env via script do projeto.
			command: "yarn start",
			cwd: "../backend",
			url: `${API_BASE_URL}/health`,
			reuseExistingServer: true,
			timeout: 180_000,
			stdout: "pipe",
			stderr: "pipe",
		},
		{
			command: "yarn dev --port 5173 --strictPort",
			url: FRONTEND_URL,
			env: { VITE_API_URL: API_BASE_URL },
			reuseExistingServer: true,
			timeout: 120_000,
		},
	],
});
