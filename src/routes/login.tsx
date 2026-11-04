import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { LoginHero } from "#/components/layout/LoginHero";
import { PublicShell } from "#/components/layout/PublicShell";
import { Button } from "#/components/ui/Button";
import { TextInput } from "#/components/ui/Field";
import { Tabs } from "#/components/ui/Tabs";
import { ApiError, apiFetch } from "#/lib/api";
import { sessionQueryKey } from "#/lib/session";

type Perfil = "administrador" | "usuario";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

/** Mensagem de erro de login: o contrato manda, a tela só traduz o 429. */
function describeLoginError(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.code === "RATE_LIMIT_EXCEEDED" || error.status === 429) {
			return `Muitas tentativas de login. Tente de novo em ${
				error.retryAfterSeconds ?? 900
			} segundos.`;
		}

		return error.message;
	}

	return "Não foi possível entrar. Tente de novo.";
}

function LoginPage() {
	const [perfil, setPerfil] = useState<Perfil>("administrador");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const login = useMutation({
		mutationFn: (credentials: { email: string; password: string }) =>
			apiFetch<{ user: unknown; token: string }>("/auth/login", {
				method: "POST",
				body: credentials,
			}),
		onSuccess: async () => {
			// A sessão de verdade é lida de `/auth/me` (o cookie já foi gravado).
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			await navigate({ to: "/dashboard" });
		},
		onError: (error) => setErrorMessage(describeLoginError(error)),
	});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);
		login.mutate({ email, password });
	}

	return (
		<PublicShell hero={<LoginHero />}>
			<form
				onSubmit={handleSubmit}
				className="relative h-[680px] w-full max-w-[500px] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_10px_28px_rgba(0,0,0,0.14)]"
			>
				<div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-br from-brand-500 to-brand-600" />

				<div className="absolute left-4 right-4 top-[38px] flex items-center justify-between sm:left-6 sm:right-9">
					<div className="flex h-8 items-center gap-[6px]">
						<img
							src="/NP07.svg"
							alt=""
							aria-hidden="true"
							className="h-6 w-8 sm:h-8 sm:w-10"
						/>
						<img
							src="/NP08-light.svg"
							alt="NETProfissional"
							className="h-5 w-[116px] object-contain object-left sm:h-[25px] sm:w-[158px]"
						/>
					</div>
					<span className="inline-flex h-[26px] w-[110px] items-center justify-center rounded-full border border-amber-600 bg-amber-100 px-2 text-[9px] font-semibold text-[#d97706] sm:px-[10px] sm:text-[10px]">
						🔒 Acesso Seguro
					</span>
				</div>

				<div className="mx-6 pt-[92px] sm:mx-[47px]">
					<div>
						<h2 className="text-2xl font-normal leading-[29px] tracking-tight text-slate-800">
							Bem-vindo de volta
						</h2>
						<p className="mt-[3px] text-[13px] leading-4 text-slate-500">
							Acesse o painel comercial da NetProfissional
						</p>
					</div>

					<Tabs
						tone="brand"
						value={perfil}
						onChange={setPerfil}
						className="mt-[22px]"
						items={[
							{ value: "administrador", label: "Administrador" },
							{ value: "usuario", label: "Usuário" },
						]}
					/>

					<div className="mt-[19px]">
						<label htmlFor="email-input" className="block">
							<span className="mb-2 block text-[12px] font-bold leading-[14px] text-slate-800">
								E-mail Corporativo
							</span>
							<TextInput
								id="email-input"
								type="email"
								name="email"
								autoComplete="email"
								required
								placeholder="seu.email@empresa.com.br"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</label>
					</div>

					<div className="mt-5">
						<div className="mb-2 flex items-center justify-between">
							<label
								htmlFor="senha-input"
								className="text-xs font-bold leading-[14px] text-slate-800"
							>
								Senha de Acesso
							</label>
							<Link
								to="/recuperar-senha"
								className="text-xs font-bold leading-[14px] text-sky-600 hover:text-sky-700 hover:underline"
							>
								Esqueceu a senha?
							</Link>
						</div>
						<TextInput
							id="senha-input"
							type="password"
							name="password"
							autoComplete="current-password"
							required
							placeholder="••••••••••••••••"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
						/>
					</div>

					{errorMessage ? (
						<p
							role="alert"
							className="mt-4 rounded-lg border border-brand-500/30 bg-brand-50 p-3 text-xs font-semibold text-brand-600"
						>
							{errorMessage}
						</p>
					) : null}

					<div className="mt-5 flex h-[62px] items-start rounded-lg border border-emerald-600 bg-emerald-100 px-[15px] py-[9px]">
						<div>
							<p className="text-[11px] font-bold leading-[14px] text-emerald-700">
								🔒 Conexão Criptografada e Segura
							</p>
							<p className="mt-0.5 text-[11px] leading-[14px] text-[#4d484d]">
								Ambiente protegido por protocolo SSL/TLS com armazenamento
								seguro de credenciais.
							</p>
						</div>
					</div>

					<Button
						type="submit"
						variant="brand"
						size="lg"
						disabled={login.isPending}
						aria-busy={login.isPending}
						className="mt-7 w-full rounded-md bg-gradient-to-br from-brand-500 to-brand-600 text-sm font-bold shadow-[0_6px_12px_rgba(0,0,0,0.16)]"
					>
						ENTRAR NO PAINEL DE LEADS →
					</Button>
				</div>
			</form>
		</PublicShell>
	);
}
