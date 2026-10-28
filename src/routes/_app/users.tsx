import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "#/components/layout/PageHeader";
import { Avatar } from "#/components/ui/Avatar";
import { Badge, type BadgeTone } from "#/components/ui/Badge";
import { Button } from "#/components/ui/Button";
import { Card } from "#/components/ui/Card";
import { DataTable, type TableColumn } from "#/components/ui/DataTable";
import {
	useBlockUser,
	useInviteUser,
	useUpdateUser,
	useUsers,
} from "#/features/users/api";
import {
	type StatusUsuario,
	toUsuario,
	type Usuario,
	userErrorMessage,
} from "#/features/users/data";
import {
	type InviteDraft,
	type UserDialogMode,
	UserDialogs,
} from "#/features/users/UserDialogs";
import { getSession, useSession } from "#/lib/session";

export const Route = createFileRoute("/_app/users")({
	beforeLoad: async () => {
		const session = await getSession();

		if (session?.role !== "ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: UsuariosPage,
});

const STATUS_TONE: Record<StatusUsuario, BadgeTone> = {
	ATIVO: "success",
	PENDENTE: "warning",
	BLOQUEADO: "brand",
};

function UsuariosPage() {
	const session = useSession();
	const usersQuery = useUsers({ limit: 20 });
	const invite = useInviteUser();
	const update = useUpdateUser();
	const block = useBlockUser();

	const [mode, setMode] = useState<UserDialogMode | null>(null);
	const [notice, setNotice] = useState("");
	const [failure, setFailure] = useState("");

	const users = useMemo(
		() => (usersQuery.data?.items ?? []).map(toUsuario),
		[usersQuery.data],
	);
	const pending = invite.isPending || update.isPending || block.isPending;

	const openDialog = useCallback((next: UserDialogMode) => {
		setFailure("");
		setMode(next);
	}, []);

	function closeDialog() {
		setMode(null);
		setFailure("");
	}

	function inviteUser(draft: InviteDraft) {
		setFailure("");
		invite.mutate(
			{
				name: draft.nome,
				email: draft.email,
				operationalRole: draft.subfuncao,
				role: draft.subfuncao === "ADMIN" ? "ADMIN" : "USUARIO",
			},
			{
				onSuccess: () => {
					closeDialog();
					setNotice(`Convite enviado para ${draft.email}.`);
				},
				onError: (error) =>
					setFailure(
						userErrorMessage(error, "Não foi possível enviar o convite."),
					),
			},
		);
	}

	function editUser(user: Usuario) {
		setFailure("");
		update.mutate(
			{
				id: user.id,
				name: user.nome,
				role: user.perfil,
				operationalRole: user.subfuncao,
			},
			{
				onSuccess: () => {
					closeDialog();
					setNotice(`Dados de ${user.nome} atualizados.`);
				},
				onError: (error) =>
					setFailure(
						userErrorMessage(error, "Não foi possível salvar as alterações."),
					),
			},
		);
	}

	function blockUser(user: Usuario, replacementId: string) {
		setFailure("");
		const replacement = users.find((item) => item.id === replacementId);

		block.mutate(
			{ id: user.id, reassignToUserId: replacementId },
			{
				onSuccess: (response) => {
					closeDialog();
					setNotice(
						`Acesso de ${user.nome} bloqueado; ${response.reassigned} leads transferidos${
							replacement ? ` para ${replacement.nome}` : ""
						}.`,
					);
				},
				onError: (error) =>
					setFailure(
						userErrorMessage(error, "Não foi possível bloquear o colaborador."),
					),
			},
		);
	}

	const columns = useMemo<TableColumn<Usuario>[]>(
		() => [
			{
				key: "colaborador",
				header: "Colaborador / E-mail",
				render: (user) => (
					<div className="flex min-w-[220px] items-center gap-3">
						<Avatar
							name={user.nome}
							tone={
								user.subfuncao === "ADMIN"
									? "brand"
									: user.subfuncao === "CAPTADOR"
										? "success"
										: "info"
							}
						/>
						<div className="min-w-0">
							<p className="truncate text-[13px] font-bold text-ink-strong">
								{user.nome}
							</p>
							<p className="mt-0.5 truncate text-[11px] text-ink-muted">
								{user.email}
							</p>
						</div>
					</div>
				),
			},
			{
				key: "perfil",
				header: "Perfil",
				render: (user) => <Badge tone="neutral">{user.perfil}</Badge>,
			},
			{
				key: "subfuncao",
				header: "Subfunção",
				render: (user) => <Badge tone="accent">{user.subfuncao}</Badge>,
			},
			{
				key: "status",
				header: "Status",
				render: (user) => (
					<Badge tone={STATUS_TONE[user.status]}>{user.status}</Badge>
				),
			},
			{
				key: "data",
				header: "Data",
				render: (user) => (
					<span className="text-xs text-ink-muted">{user.data}</span>
				),
			},
			{
				key: "acoes",
				header: "Ações",
				render: (user) => (
					<div className="flex flex-wrap gap-2">
						<Button
							size="sm"
							variant="outline"
							aria-label={`Editar ${user.nome}`}
							onClick={() => openDialog({ type: "edit", user })}
						>
							Editar
						</Button>
						<Button
							size="sm"
							variant="ghost"
							aria-label={`Bloquear ${user.nome}`}
							disabled={
								user.id === session.userId || user.status === "BLOQUEADO"
							}
							onClick={() => openDialog({ type: "block", user })}
						>
							Bloquear
						</Button>
					</div>
				),
			},
		],
		// `openDialog` é estável (`useCallback`); `session.userId` decide quem pode ser bloqueado.
		[session.userId, openDialog],
	);

	return (
		<>
			<PageHeader
				eyebrow="👥 GESTÃO DA EQUIPE"
				title="Gestão de Usuários & Funções do Tenant"
				actions={
					<Button
						variant="brand"
						size="sm"
						className="font-bold shadow-xs"
						onClick={() => openDialog({ type: "invite" })}
					>
						+ Convidar por e-mail
					</Button>
				}
			/>
			<div className="mb-5 rounded-xl border border-warning-200 bg-warning-50/70 px-5 py-3.5 shadow-xs">
				<p className="text-[12px] font-bold text-amber-800">
					🔐 CONTROLE EXCLUSIVO DO ADMINISTRADOR DO TENANT
				</p>
				<p className="mt-1 text-[11px] text-ink-muted leading-relaxed">
					Cadastre membros da equipe enviando convite por e-mail com token
					válido por 48h, defina funções (Admin, Captador, Vendedor) ou bloqueie
					acessos com transferência mandatória de leads.
				</p>
			</div>
			{notice ? (
				<output className="mb-4 block rounded-md border border-success-500 bg-success-50 px-4 py-3 text-sm text-success-600">
					{notice}
				</output>
			) : null}
			{failure && !mode ? (
				<p
					role="alert"
					className="mb-4 rounded-md border border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-600"
				>
					{failure}
				</p>
			) : null}
			{usersQuery.isError ? (
				<div
					role="alert"
					className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand-500 bg-brand-50 px-4 py-3 text-sm text-brand-600"
				>
					<span>
						{userErrorMessage(
							usersQuery.error,
							"Não foi possível carregar a equipe.",
						)}
					</span>
					<Button
						size="sm"
						variant="outline"
						onClick={() => usersQuery.refetch()}
					>
						Tentar de novo
					</Button>
				</div>
			) : null}
			<Card>
				{usersQuery.isPending ? (
					<p className="px-5 py-10 text-center text-[12px] text-ink-subtle">
						Carregando colaboradores...
					</p>
				) : (
					<DataTable
						columns={columns}
						rows={users}
						rowKey={(user) => user.id}
						emptyLabel="Nenhum colaborador cadastrado."
						rowClassName={(user) =>
							user.status === "PENDENTE"
								? "bg-warning-50/70"
								: user.status === "BLOQUEADO"
									? "bg-brand-50/50"
									: ""
						}
					/>
				)}
			</Card>
			<UserDialogs
				mode={mode}
				users={users}
				pending={pending}
				error={mode ? failure : ""}
				onClose={closeDialog}
				onInvite={inviteUser}
				onEdit={editUser}
				onBlock={blockUser}
			/>
		</>
	);
}
