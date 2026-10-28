/**
 * Hooks de dados da gestão de usuários.
 *
 * Todas as chamadas passam pelo `apiFetch` (envelope + `ApiError`) e qualquer
 * escrita invalida a chave `["users"]`, que é a mesma usada pela lista — assim
 * a tabela recarrega sozinha depois de convidar, editar ou bloquear.
 */

import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { type ApiPage, apiFetch } from "#/lib/api";
import type { OperationalRole, UserRole } from "#/lib/session";
import type { User, UserStatus } from "./data";

/** Filtros aceitos por `GET /users`. */
export interface UsersFilters {
	q?: string;
	role?: UserRole;
	operationalRole?: OperationalRole;
	status?: UserStatus;
	page?: number;
	limit?: number;
}

/** Raiz do cache da listagem: invalidar aqui atinge todas as combinações. */
export const usersQueryKey = ["users"] as const;

export function usersQueryOptions(filters: UsersFilters = {}) {
	return queryOptions({
		queryKey: [...usersQueryKey, filters],
		queryFn: () =>
			apiFetch<ApiPage<User>>("/users", {
				query: {
					q: filters.q,
					role: filters.role,
					// A query string do backend é snake_case; o resto do frontend não.
					operational_role: filters.operationalRole,
					status: filters.status,
					page: filters.page,
					limit: filters.limit,
				},
			}),
	});
}

/** Lista de colaboradores do tenant. */
export function useUsers(filters: UsersFilters = {}) {
	return useQuery(usersQueryOptions(filters));
}

/** Corpo de `POST /users/invite`. */
export interface InviteUserInput {
	name: string;
	email: string;
	operationalRole: OperationalRole;
	role?: UserRole;
}

/** Resposta de `POST /users/invite`. */
export interface InviteUserResponse {
	invite_id: string;
	email: string;
	role: UserRole;
	operational_role: OperationalRole;
	expires_at: string;
	message: string;
}

export function useInviteUser() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: (input: InviteUserInput) =>
			apiFetch<InviteUserResponse>("/users/invite", {
				method: "POST",
				body: {
					name: input.name,
					email: input.email,
					operational_role: input.operationalRole,
					role: input.role,
				},
			}),
		onSuccess: () => client.invalidateQueries({ queryKey: usersQueryKey }),
	});
}

/** Corpo de `PATCH /users/{id}` (o e-mail não é editável). */
export interface UpdateUserInput {
	id: string;
	name?: string;
	role?: UserRole;
	operationalRole?: OperationalRole;
	status?: "ACTIVE" | "PENDING";
}

export function useUpdateUser() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			name,
			role,
			operationalRole,
			status,
		}: UpdateUserInput) =>
			apiFetch<User>(`/users/${id}`, {
				method: "PATCH",
				body: { name, role, operational_role: operationalRole, status },
			}),
		onSuccess: () => client.invalidateQueries({ queryKey: usersQueryKey }),
	});
}

/** Corpo de `POST /users/{id}/block`: o substituto é obrigatório. */
export interface BlockUserInput {
	id: string;
	reassignToUserId: string;
}

/** Resposta de `POST /users/{id}/block`. */
export interface BlockUserResponse {
	blocked: true;
	reassigned: number;
	user_id: string;
	status: "BLOCKED";
	transferred_to: string;
	message: string;
}

export function useBlockUser() {
	const client = useQueryClient();

	return useMutation({
		mutationFn: ({ id, reassignToUserId }: BlockUserInput) =>
			apiFetch<BlockUserResponse>(`/users/${id}/block`, {
				method: "POST",
				body: { reassign_to_user_id: reassignToUserId },
			}),
		onSuccess: () => client.invalidateQueries({ queryKey: usersQueryKey }),
	});
}
