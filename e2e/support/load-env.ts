import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Carrega o `backend/.env` no `process.env` da suíte E2E, sem dependência
 * externa (não há `dotenv` no frontend). Só preenche chaves ainda ausentes —
 * variáveis já exportadas no shell têm prioridade.
 *
 * Com isso, `yarn e2e` funciona apenas com o backend no ar, sem exigir
 * `set -a; . backend/.env; set +a` antes de rodar.
 */
export function loadBackendEnv(): void {
	const currentDir = path.dirname(fileURLToPath(import.meta.url));
	// e2e/support -> e2e -> frontend -> raiz -> backend/.env
	const envPath = path.resolve(
		currentDir,
		"..",
		"..",
		"..",
		"backend",
		".env",
	);

	if (!fs.existsSync(envPath)) return;

	const content = fs.readFileSync(envPath, "utf8");
	for (const rawLine of content.split("\n")) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		const eq = line.indexOf("=");
		if (eq === -1) continue;

		const key = line.slice(0, eq).trim();
		let value = line.slice(eq + 1).trim();

		// Remove aspas simples/duplas envolventes.
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		if (key && process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
}
