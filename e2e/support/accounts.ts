import { SEED_PASSWORD } from "./env";

/** Domínio do tenant de homologação (backend/prisma/SEED-E2E.md). */
const DOMAIN = "e2e.netprofissional.test";

/** Contas semeadas — todas usam SEED_E2E_PASSWORD. */
export const accounts = {
	admin: { email: `admin@${DOMAIN}`, password: SEED_PASSWORD },
	vendedor1: { email: `vendedor1@${DOMAIN}`, password: SEED_PASSWORD },
	vendedor2: { email: `vendedor2@${DOMAIN}`, password: SEED_PASSWORD },
	captador: { email: `captador@${DOMAIN}`, password: SEED_PASSWORD },
	pendente: { email: `pendente@${DOMAIN}`, password: SEED_PASSWORD },
	bloqueado: { email: `bloqueado@${DOMAIN}`, password: SEED_PASSWORD },
} as const;

export type AccountKey = keyof typeof accounts;
