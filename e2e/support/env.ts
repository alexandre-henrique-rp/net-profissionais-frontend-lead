/**
 * Configuração da suíte E2E lida do ambiente.
 *
 * Nenhum segredo fica no código: a senha e os tokens vêm das mesmas variáveis
 * que a seed usa (backend/.env, carregado automaticamente abaixo).
 */

import { loadBackendEnv } from "./load-env";

// Carrega o backend/.env assim que este módulo é avaliado, para que as
// constantes abaixo (e qualquer `requireSecret`) enxerguem os segredos sem
// depender de `set -a; . backend/.env; set +a` no shell.
loadBackendEnv();

const backendPort = process.env.PORT?.trim() || "3000";
export const API_URL =
	process.env.E2E_API_URL?.trim() ||
	`http://localhost:${backendPort}/api/v1`;

export const SEED_PASSWORD = process.env.SEED_E2E_PASSWORD ?? "";
export const WEBHOOK_TOKEN = process.env.SEED_E2E_WEBHOOK_TOKEN ?? "";
export const INVITE_TOKEN = process.env.SEED_E2E_INVITE_TOKEN ?? "";

/** Falha cedo e com mensagem clara se faltar um segredo obrigatório. */
export function requireSecret(name: "password" | "webhook" | "invite"): string {
	const map = {
		password: ["SEED_E2E_PASSWORD", SEED_PASSWORD] as const,
		webhook: ["SEED_E2E_WEBHOOK_TOKEN", WEBHOOK_TOKEN] as const,
		invite: ["SEED_E2E_INVITE_TOKEN", INVITE_TOKEN] as const,
	};
	const [envName, value] = map[name];
	if (!value) {
		throw new Error(
			`[e2e] Variável ${envName} ausente. Ela é lida automaticamente de ` +
				"backend/.env — confira se o arquivo existe e tem essa chave preenchida.",
		);
	}
	return value;
}
