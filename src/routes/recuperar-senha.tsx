import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useMemo, useState } from "react";
import { LoginHero } from "#/components/layout/LoginHero";
import { PublicShell } from "#/components/layout/PublicShell";
import { Button } from "#/components/ui/Button";
import { Field, TextInput } from "#/components/ui/Field";
import { apiFetch } from "#/lib/api";

export const Route = createFileRoute("/recuperar-senha")({
	validateSearch: (search: Record<string, unknown>): { token?: string } => ({
		token:
			typeof search.token === "string" && search.token !== ""
				? search.token
				: undefined,
	}),
	component: RecoverPasswordRoute,
});

function RecoverPasswordRoute() {
	const { token } = Route.useSearch();

	if (token) {
		return <ResetPasswordStep token={token} />;
	}

	return <RequestResetStep />;
}

/**
 * Etapa 1: Solicitar link de recuperação informando o e-mail corporativo.
 */
function RequestResetStep() {
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);

	/**
	 * O backend responde `{ sent: true }` exista ou não a conta — a tela não
	 * pode diferenciar os dois casos (enumeração de usuários).
	 */
	const requestReset = useMutation({
		mutationFn: (address: string) =>
			apiFetch<{ sent: true }>("/auth/forgot-password", {
				method: "POST",
				body: { email: address },
			}),
		onSuccess: () => setSent(true),
	});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		requestReset.mutate(email);
	}

	return (
		<PublicShell hero={<LoginHero />}>
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
			>
				{/* Barra vermelha de topo do Penpot Tela 01-B-L */}
				<div className="h-1.5 w-full bg-brand-500" />

				<div className="flex flex-col gap-5 p-7 sm:p-9">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="flex size-8 items-center justify-center rounded-lg bg-brand-500 text-xs font-black text-white shadow-xs">
								NP
							</div>
							<div>
								<span className="block text-base font-bold tracking-tight text-ink-strong leading-none">
									NETProfissional
								</span>
								<span className="block text-[10px] font-semibold text-ink-subtle leading-tight">
									Gerador de Leads
								</span>
							</div>
						</div>
						<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-300">
							⏳ Token 15 min
						</span>
					</div>

					<div>
						<h2 className="text-2xl font-bold tracking-tight text-ink-strong">
							Recuperar acesso
						</h2>
						<p className="mt-1 text-[13px] text-ink-muted leading-relaxed">
							Informe seu e-mail corporativo cadastrado para receber as
							instruções de redefinição de senha segura.
						</p>
					</div>

					<Field label="E-mail Corporativo">
						<TextInput
							type="email"
							name="email"
							autoComplete="email"
							required
							placeholder="colaborador@netprofissional.com.br"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
					</Field>

					{requestReset.isError ? (
						<p
							role="alert"
							className="rounded-xl border border-brand-500/30 bg-brand-50 p-3 text-xs font-semibold text-brand-600 dark:text-rose-300"
						>
							{requestReset.error instanceof Error
								? requestReset.error.message
								: "Não foi possível enviar as instruções. Tente de novo."}
						</p>
					) : null}

					{sent ? (
						<output className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
							Se o e-mail estiver cadastrado, você receberá um link válido por
							15 minutos.
						</output>
					) : null}

					<Button
						type="submit"
						variant="brand"
						size="lg"
						disabled={requestReset.isPending}
						className="w-full text-sm font-bold shadow-md shadow-brand-500/20 py-3.5"
					>
						{requestReset.isPending ? "Enviando..." : "Enviar instruções"}
					</Button>

					<div className="flex justify-center">
						<Link
							to="/login"
							className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
						>
							Voltar para o login
						</Link>
					</div>

					<div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-start gap-3 dark:border-emerald-700/60 dark:bg-emerald-950/50">
						<span className="text-base leading-none">🔒</span>
						<div>
							<p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
								Ambiente Seguro & Criptografado
							</p>
							<p className="mt-0.5 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
								Tokens assinados temporários protegidos contra interceptação.
							</p>
						</div>
					</div>
				</div>
			</form>
		</PublicShell>
	);
}

/**
 * Etapa 2: Definir nova senha usando o token recebido por e-mail.
 */
function ResetPasswordStep({ token }: { token: string }) {
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [resetSuccess, setResetSuccess] = useState(false);
	const navigate = useNavigate();

	const rules = useMemo(
		() => [
			{ label: "Pelo menos 8 caracteres", valid: password.length >= 8 },
			{ label: "Uma letra maiúscula", valid: /[A-Z]/.test(password) },
			{ label: "Uma letra minúscula", valid: /[a-z]/.test(password) },
			{ label: "Um número", valid: /\d/.test(password) },
		],
		[password],
	);

	const passwordIsValid = rules.every((rule) => rule.valid);
	const matches = password.length > 0 && password === confirmation;

	const resetMutation = useMutation({
		mutationFn: () =>
			apiFetch<{ reset: true }>("/auth/reset-password", {
				method: "POST",
				body: { token, password },
			}),
		onSuccess: () => {
			setResetSuccess(true);
		},
	});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (passwordIsValid && matches) {
			resetMutation.mutate();
		}
	}

	return (
		<PublicShell hero={<LoginHero />}>
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
			>
				{/* Barra vermelha de topo do Penpot Tela 01-B-L */}
				<div className="h-1.5 w-full bg-brand-500" />

				<div className="flex flex-col gap-5 p-7 sm:p-9">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="flex size-8 items-center justify-center rounded-lg bg-brand-500 text-xs font-black text-white shadow-xs">
								NP
							</div>
							<div>
								<span className="block text-base font-bold tracking-tight text-ink-strong leading-none">
									NETProfissional
								</span>
								<span className="block text-[10px] font-semibold text-ink-subtle leading-tight">
									Gerador de Leads
								</span>
							</div>
						</div>
						<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-300">
							⏳ Token 15 min
						</span>
					</div>

					<div>
						<h2 className="text-2xl font-bold tracking-tight text-ink-strong">
							Criar nova senha
						</h2>
						<p className="mt-1 text-[13px] text-ink-muted leading-relaxed">
							Defina uma nova senha forte para acessar sua conta corporativa.
						</p>
					</div>

					{resetSuccess ? (
						<div className="flex flex-col gap-4">
							<output className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-semibold text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200">
								Senha redefinida com sucesso! Você já pode entrar com sua nova
								senha.
							</output>
							<Button
								type="button"
								variant="brand"
								size="lg"
								className="w-full text-sm font-bold shadow-md shadow-brand-500/20 py-3.5"
								onClick={() => navigate({ to: "/login" })}
							>
								Entrar no Painel →
							</Button>
						</div>
					) : (
						<>
							<Field label="Nova senha">
								<TextInput
									type="password"
									autoComplete="new-password"
									required
									placeholder="••••••••••••••••"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
								/>
							</Field>

							<ul
								aria-label="Critérios da senha"
								className="grid gap-1.5 text-xs"
							>
								{rules.map((rule) => (
									<li
										key={rule.label}
										className={`flex items-center gap-1.5 font-medium ${
											rule.valid
												? "text-emerald-600 dark:text-emerald-400"
												: "text-ink-subtle"
										}`}
									>
										<span aria-hidden className="font-bold">
											{rule.valid ? "✓" : "○"}
										</span>
										<span>{rule.label}</span>
									</li>
								))}
							</ul>

							<Field label="Confirmar nova senha">
								<TextInput
									type="password"
									autoComplete="new-password"
									required
									placeholder="••••••••••••••••"
									value={confirmation}
									onChange={(event) => setConfirmation(event.target.value)}
								/>
							</Field>

							{confirmation && !matches ? (
								<p
									role="alert"
									className="-mt-3 text-xs font-bold text-brand-600 dark:text-rose-300"
								>
									As senhas não correspondem.
								</p>
							) : null}

							{resetMutation.isError ? (
								<div className="rounded-xl border border-brand-500/30 bg-brand-50 p-3.5 text-xs text-brand-600 dark:text-rose-300">
									<p className="font-semibold">
										{resetMutation.error instanceof Error
											? resetMutation.error.message
											: "Não foi possível redefinir sua senha. O link pode ter expirado."}
									</p>
									<Link
										to="/recuperar-senha"
										search={{ token: undefined }}
										className="mt-2 inline-block font-bold text-brand-600 underline dark:text-rose-300"
									>
										Solicitar um novo link de recuperação
									</Link>
								</div>
							) : null}

							<Button
								type="submit"
								variant="brand"
								size="lg"
								disabled={
									!passwordIsValid || !matches || resetMutation.isPending
								}
								className="w-full text-sm font-bold shadow-md shadow-brand-500/20 py-3.5 disabled:opacity-50"
							>
								{resetMutation.isPending ? "Redefinindo..." : "Redefinir senha"}
							</Button>

							<div className="flex justify-center">
								<Link
									to="/login"
									className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
								>
									Voltar para o login
								</Link>
							</div>
						</>
					)}

					<div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-start gap-3 dark:border-emerald-700/60 dark:bg-emerald-950/50">
						<span className="text-base leading-none">🔒</span>
						<div>
							<p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
								Proteção de Credenciais
							</p>
							<p className="mt-0.5 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
								Senhas criptografadas com Argon2id de alta resistência.
							</p>
						</div>
					</div>
				</div>
			</form>
		</PublicShell>
	);
}
