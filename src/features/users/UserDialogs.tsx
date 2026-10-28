import { type FormEvent, useEffect, useState } from "react";
import { Button } from "#/components/ui/Button";
import { Dialog } from "#/components/ui/Dialog";
import { Field, TextInput } from "#/components/ui/Field";
import { OPERATIONAL_ROLE_LABEL, type Usuario } from "#/features/users/data";
import type { OperationalRole } from "#/lib/session";

export type UserDialogMode =
	| { type: "invite" }
	| { type: "edit"; user: Usuario }
	| { type: "block"; user: Usuario };

/** Dados que o formulário de convite entrega para a página. */
export interface InviteDraft {
	nome: string;
	email: string;
	subfuncao: OperationalRole;
}

export interface UserDialogsProps {
	mode: UserDialogMode | null;
	/** Colaboradores da lista — as opções de substituto saem daqui. */
	users: Usuario[];
	/** Requisição em andamento: trava os botões até a API responder. */
	pending?: boolean;
	/** Erro devolvido pela API, exibido em `role="alert"`. */
	error?: string;
	onClose: () => void;
	onInvite: (draft: InviteDraft) => void;
	onEdit: (user: Usuario) => void;
	onBlock: (user: Usuario, replacementId: string) => void;
}

const OPERATIONAL_ROLES = Object.keys(
	OPERATIONAL_ROLE_LABEL,
) as OperationalRole[];

/**
 * Formulários de convite, edição e bloqueio.
 *
 * O diálogo não fecha sozinho ao enviar: quem fecha é a página, quando a API
 * confirma. Assim o erro (e-mail duplicado, cota excedida, último admin) fica
 * visível no próprio formulário, sem perder o que foi digitado.
 */
export function UserDialogs({
	mode,
	users,
	pending = false,
	error,
	onClose,
	onInvite,
	onEdit,
	onBlock,
}: UserDialogsProps) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<OperationalRole>("VENDEDOR");
	const [replacementId, setReplacementId] = useState("");

	useEffect(() => {
		if (mode?.type === "edit") {
			setName(mode.user.nome);
			setEmail(mode.user.email);
			setRole(mode.user.subfuncao);
		} else {
			setName("");
			setEmail("");
			setRole("VENDEDOR");
			setReplacementId("");
		}
	}, [mode]);

	function close() {
		setName("");
		setEmail("");
		setRole("VENDEDOR");
		setReplacementId("");
		onClose();
	}

	if (!mode) return null;
	const editingUser = mode.type === "invite" ? null : mode.user;

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!mode) return;

		if (mode.type === "invite") {
			onInvite({ nome: name, email, subfuncao: role });
			return;
		}

		if (mode.type === "edit" && editingUser) {
			onEdit({
				...editingUser,
				nome: name,
				perfil: role === "ADMIN" ? "ADMIN" : "USUARIO",
				subfuncao: role,
			});
			return;
		}

		if (mode.type === "block" && editingUser && replacementId) {
			onBlock(editingUser, replacementId);
		}
	}

	const title =
		mode.type === "invite"
			? "Convidar colaborador"
			: mode.type === "edit"
				? "Editar colaborador"
				: "Bloquear colaborador";

	const replacements = users.filter(
		(user) => user.id !== editingUser?.id && user.status === "ATIVO",
	);

	return (
		<Dialog open title={title} description={editingUser?.nome} onClose={close}>
			{error ? (
				<p
					role="alert"
					className="mb-4 rounded-md border border-brand-500 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-600"
				>
					{error}
				</p>
			) : null}
			{mode.type === "block" ? (
				<form onSubmit={submit} className="grid gap-4">
					<p className="text-sm text-ink">
						O acesso será bloqueado e os leads ativos precisam de um novo
						responsável. Esta ação não pode ser desfeita nesta tela.
					</p>
					<label className="grid gap-1.5 text-xs font-bold text-ink-strong">
						Transferir leads ativos para
						<select
							required
							value={replacementId}
							onChange={(event) => setReplacementId(event.target.value)}
							className="h-11 rounded-md border border-line-strong bg-canvas px-3 text-sm"
						>
							<option value="">Selecione uma pessoa</option>
							{replacements.map((user) => (
								<option key={user.id} value={user.id}>
									{user.nome}
								</option>
							))}
						</select>
					</label>
					{replacements.length === 0 ? (
						<p className="text-xs text-ink-muted">
							Nenhum outro colaborador ativo para receber os leads.
						</p>
					) : null}
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={close}>
							Cancelar
						</Button>
						<Button
							type="submit"
							variant="info"
							disabled={pending || !replacementId}
						>
							{pending ? "Bloqueando..." : "Bloquear acesso"}
						</Button>
					</div>
				</form>
			) : (
				<form onSubmit={submit} className="grid gap-4">
					<Field label="Nome completo">
						<TextInput
							required
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</Field>
					<Field
						label="E-mail corporativo"
						hint={
							mode.type === "edit"
								? "O e-mail de acesso não muda por aqui."
								: undefined
						}
					>
						<TextInput
							type="email"
							required
							readOnly={mode.type === "edit"}
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
					</Field>
					<label className="grid gap-1.5 text-xs font-bold text-ink-strong">
						Função operacional
						<select
							value={role}
							onChange={(event) =>
								setRole(event.target.value as OperationalRole)
							}
							className="h-11 rounded-md border border-line-strong bg-canvas px-3 text-sm"
						>
							{OPERATIONAL_ROLES.map((value) => (
								<option key={value} value={value}>
									{OPERATIONAL_ROLE_LABEL[value]}
								</option>
							))}
						</select>
					</label>
					<div className="flex justify-end gap-2 border-t border-line pt-4">
						<Button type="button" variant="outline" onClick={close}>
							Cancelar
						</Button>
						<Button type="submit" disabled={pending}>
							{mode.type === "invite"
								? pending
									? "Enviando..."
									: "Enviar convite"
								: pending
									? "Salvando..."
									: "Salvar alterações"}
						</Button>
					</div>
				</form>
			)}
		</Dialog>
	);
}
