/**
 * Sessão da pessoa logada.
 *
 * A fonte de verdade é o cookie `np_session` (HttpOnly): o frontend não lê o
 * cookie, só pergunta ao backend quem é o dono dele em `GET /auth/me`. O
 * resultado fica em cache no TanStack Query, que é o mesmo cache usado pelos
 * guards (`beforeLoad`) e pelos componentes.
 */

import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ApiError, apiFetch } from "./api";
import { queryClient } from "./query-client";

export type UserRole = "ADMIN" | "USUARIO";
export type OperationalRole = "ADMIN" | "CAPTADOR" | "VENDEDOR";

export interface Session {
	/** Identificador do colaborador (`User.id`). */
	userId: string;
	/** Identificador da corporação (`Tenant.id`) — usado no webhook. */
	tenantId: string;
	tenantName: string;
	name: string;
	email: string;
	/** Papel de corpus: o que a pessoa pode fazer na corporação. */
	role: UserRole;
	/** Subfunção operacional: define dashboard e navegação. */
	operationalRole: OperationalRole;
}

/** Rótulo do papel exibido no cartão de perfil da sidebar e da topbar. */
export const ROLE_LABELS: Record<OperationalRole, string> = {
	ADMIN: "Administrador Geral",
	CAPTADOR: "Captador Oficial",
	VENDEDOR: "Vendedor Especialista",
};

/**
 * Sessão de apoio para testes e para o modo de desenvolvimento sem backend.
 *
 * Nenhuma tela usa este objeto como fonte de dados: quem decide o que aparece
 * é a resposta de `/auth/me`.
 */
export const mockSession: Session = {
	userId: "00000000-0000-0000-0000-000000000000",
	tenantId: "00000000-0000-0000-0000-000000000001",
	tenantName: "NetProfissional",
	name: "Alexandre Henrique",
	email: "carlos.admin@netprofissional.com.br",
	role: "ADMIN",
	operationalRole: "ADMIN",
};

/** Resposta de `GET /auth/me`. */
export interface MeResponse {
	user: {
		id: string;
		name: string;
		email: string;
		role: UserRole;
		operationalRole: OperationalRole;
	};
	tenant: { id: string; name: string; tradeName: string | null };
}

/** Traduz o payload da API no formato que as telas consomem. */
export function toSession(me: MeResponse): Session {
	return {
		userId: me.user.id,
		tenantId: me.tenant.id,
		tenantName: me.tenant.name,
		name: me.user.name,
		email: me.user.email,
		role: me.user.role,
		operationalRole: me.user.operationalRole,
	};
}

/** Chave única da sessão no cache. */
export const sessionQueryKey = ["auth", "me"] as const;

export function sessionQueryOptions() {
	return queryOptions({
		queryKey: sessionQueryKey,
		queryFn: async () => toSession(await apiFetch<MeResponse>("/auth/me")),
		// Sessão expira no servidor (8h); não adianta repetir um 401.
		retry: false,
		staleTime: 60_000,
	});
}

/**
 * Sessão ativa sem passar por React — para usar em guards (`beforeLoad`).
 *
 * Devolve `null` quando não há sessão (401) ou quando o servidor não responde:
 * em ambos os casos a rota protegida manda para o login, que é o destino
 * seguro.
 */
export async function getSession(): Promise<Session | null> {
	try {
		return await queryClient.ensureQueryData(sessionQueryOptions());
	} catch (error) {
		if (error instanceof ApiError) {
			return null;
		}

		throw error;
	}
}

/** Sessão ativa dentro de componentes das rotas autenticadas. */
export function useSession(): Session {
	const { data } = useQuery(sessionQueryOptions());

	if (!data) {
		throw new Error(
			"Sessão ausente: esta rota deveria estar atrás do guard de autenticação.",
		);
	}

	return data;
}

/**
 * Encerra a sessão no servidor, limpa o cache e volta ao login.
 *
 * O `onSettled` roda mesmo se a chamada falhar: o cookie pode já ter sido
 * limpo pela resposta, e manter dados de outro usuário no cache é pior do que
 * um logout parcial.
 */
export function useLogout() {
	const navigate = useNavigate();
	const client = useQueryClient();

	return useMutation({
		mutationFn: () =>
			apiFetch<{ loggedOut: true }>("/auth/logout", { method: "POST" }),
		onSettled: async () => {
			client.clear();
			queryClient.clear();
			await navigate({ to: "/login" });
		},
	});
}
