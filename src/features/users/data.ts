/**
 * Tipos e traduções da gestão de usuários.
 *
 * A fonte de verdade é `GET /users` do backend: os nomes de campo abaixo são
 * os do contrato (`role`, `operationalRole`, `inviteExpiresAt`, ...). A tela
 * consome a forma traduzida (`Usuario`) para manter os rótulos do Penpot.
 */

import { ApiError } from "#/lib/api";
import type { OperationalRole, UserRole } from "#/lib/session";

/** Situação do colaborador no contrato da API. */
export type UserStatus = "ACTIVE" | "PENDING" | "BLOCKED";

/** Situação como a tela mostra. */
export type StatusUsuario = "ATIVO" | "PENDENTE" | "BLOQUEADO";

/** Colaborador devolvido por `GET /users`. */
export interface User {
	id: string;
	name: string;
	email: string;
	role: UserRole;
	operationalRole: OperationalRole;
	status: UserStatus;
	inviteExpiresAt: string | null;
	lastLoginAt: string | null;
	createdAt: string;
}

/** Colaborador no formato da tabela. */
export interface Usuario {
	id: string;
	nome: string;
	email: string;
	perfil: UserRole;
	subfuncao: OperationalRole;
	status: StatusUsuario;
	statusApi: UserStatus;
	data: string;
}

/** Tradução da situação da API para o rótulo da tela. */
export const STATUS_LABEL: Record<UserStatus, StatusUsuario> = {
	ACTIVE: "ATIVO",
	PENDING: "PENDENTE",
	BLOCKED: "BLOQUEADO",
};

/** Nome da função operacional exibido nos formulários. */
export const OPERATIONAL_ROLE_LABEL: Record<OperationalRole, string> = {
	ADMIN: "Administrador",
	CAPTADOR: "Captador",
	VENDEDOR: "Vendedor",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	timeZone: "UTC",
});

/** `2026-08-12T12:00:00.000Z` → `12/08/2026`; sem data → `—`. */
export function formatDate(iso: string | null): string {
	if (!iso) {
		return "—";
	}

	const date = new Date(iso);

	return Number.isNaN(date.getTime()) ? "—" : DATE_FORMATTER.format(date);
}

/** Payload da API → linha da tabela. */
export function toUsuario(user: User): Usuario {
	return {
		id: user.id,
		nome: user.name,
		email: user.email,
		perfil: user.role,
		subfuncao: user.operationalRole,
		status: STATUS_LABEL[user.status],
		statusApi: user.status,
		data: formatDate(user.createdAt),
	};
}

/** Mensagens dos erros de negócio que a gestão de usuários devolve. */
const ERROR_MESSAGES: Readonly<Record<string, string>> = {
	EMAIL_ALREADY_EXISTS:
		"Este e-mail já possui convite ou conta neste tenant. Use outro endereço.",
	USER_QUOTA_EXCEEDED:
		"O limite de usuários do tenant foi atingido. Fale com o suporte para ampliar.",
	LAST_ADMIN:
		"O tenant precisa de pelo menos um administrador ativo. Promova outra pessoa antes de mudar esta função.",
	CANNOT_BLOCK_SELF: "Você não pode bloquear o próprio acesso.",
	VALIDATION_ERROR: "Dados inválidos. Revise os campos e tente novamente.",
	NOT_FOUND: "Colaborador não encontrado. Recarregue a lista e tente de novo.",
	FORBIDDEN: "Seu perfil não tem permissão para esta operação.",
};

/** Texto para o `role="alert"` da tela, a partir do `ApiError` da chamada. */
export function userErrorMessage(
	error: unknown,
	fallback = "Não foi possível concluir a operação. Tente de novo.",
): string {
	if (error instanceof ApiError) {
		return ERROR_MESSAGES[error.code] || error.message || fallback;
	}

	return fallback;
}
