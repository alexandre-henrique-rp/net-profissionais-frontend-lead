import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FullConfig } from "@playwright/test";
import { API_URL } from "./support/env";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Garante o ponto de partida da homologação:
 *   1. o backend precisa estar respondendo em /health;
 *   2. a seed E2E é reaplicada (reset determinístico do tenant de teste).
 *
 * A seed roda via `yarn prisma:seed:e2e` no diretório do backend, que lê o
 * `backend/.env` (DATABASE_URL + segredos SEED_E2E_*). Sem backend no ar a
 * suíte falha aqui, de propósito, com uma mensagem clara.
 */
async function globalSetup(_config: FullConfig): Promise<void> {
	const healthUrl = `${API_URL}/health`;

	let ok = false;
	try {
		const res = await fetch(healthUrl);
		ok = res.ok;
	} catch {
		ok = false;
	}

	if (!ok) {
		throw new Error(
			`[e2e] Backend não respondeu em ${healthUrl}. ` +
				"Suba a API antes da suíte: cd backend && yarn start:dev " +
				"(e confira Postgres/Redis em backend/.env).",
		);
	}

	const backendDir = path.resolve(currentDir, "..", "..", "backend");
	try {
		execSync("yarn prisma:seed:e2e", {
			cwd: backendDir,
			stdio: "inherit",
		});
	} catch (error) {
		throw new Error(
			`[e2e] Falha ao aplicar a seed E2E (yarn prisma:seed:e2e em ${backendDir}). ` +
				"Confira DATABASE_URL e as variáveis SEED_E2E_* no backend/.env. " +
				`Erro: ${(error as Error).message}`,
		);
	}
}

export default globalSetup;
