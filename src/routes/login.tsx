import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { LoginHero } from "#/components/layout/LoginHero";
import { PublicShell } from "#/components/layout/PublicShell";
import { Button } from "#/components/ui/Button";
import { Field, TextInput } from "#/components/ui/Field";
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
	const [showPassword, setShowPassword] = useState(false);
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
				className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl"
			>
				{/* Barra vermelha de topo do Penpot Tela 01-L */}
				<div className="h-1.5 w-full bg-brand-500" />

				<div className="flex flex-col gap-5 p-7 sm:p-9">
					{/* Cabeçalho do Card: Logo à esquerda + Selo Seguro à direita */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2.5">
							<div className="flex size-8 items-center justify-center rounded-lg bg-brand-500 text-xs font-black text-white shadow-xs">
								NP
							</div>
							<div>
								<span className="block text-base font-bold tracking-tight text-slate-900 leading-none">
									NETProfissional
								</span>
								<span className="block text-[10px] font-semibold text-slate-400 leading-tight">
									Gerador de Leads
								</span>
							</div>
						</div>
						<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
							🔒 Acesso Seguro
						</span>
					</div>

					{/* Título e Subtítulo */}
					<div>
						<h2 className="text-2xl font-bold tracking-tight text-slate-900">
							Bem-vindo de volta
						</h2>
						<p className="mt-1 text-[13px] text-slate-500">
							Acesse o painel comercial da NetProfissional
						</p>
					</div>

					{/* Tabs Administrador / Usuário */}
					<Tabs
						tone="brand"
						value={perfil}
						onChange={setPerfil}
						items={[
							{ value: "administrador", label: "Administrador" },
							{ value: "usuario", label: "Usuário" },
						]}
					/>

					{/* Campo E-mail Corporativo */}
					<Field label="E-mail Corporativo">
						<TextInput
							type="email"
							name="email"
							autoComplete="email"
							required
							placeholder="seu.email@empresa.com.br"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
					</Field>

					{/* Campo Senha com link Esqueceu a Senha alinhado à direita na mesma linha */}
					<div>
						<div className="mb-1 flex items-center justify-between">
							<label
								htmlFor="senha-input"
								className="text-xs font-bold text-slate-700"
							>
								Senha de Acesso
							</label>
							<Link
								to="/recuperar-senha"
								className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
							>
								Esqueceu a senha?
							</Link>
						</div>
						<div className="relative flex items-center">
							<TextInput
								id="senha-input"
								type={showPassword ? "text" : "password"}
								name="password"
								autoComplete="current-password"
								required
								placeholder="••••••••••••••••"
								className="pr-10"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
								aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
							>
								{showPassword ? "👁️" : "👁️‍🗨️"}
							</button>
						</div>
					</div>

					{/* Lembrar neste navegador */}
					<div className="flex items-center gap-2">
						<input
							id="lembrar-checkbox"
							type="checkbox"
							defaultChecked
							className="size-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
						/>
						<label
							htmlFor="lembrar-checkbox"
							className="text-xs font-medium text-slate-600 cursor-pointer select-none"
						>
							Lembrar neste navegador
						</label>
					</div>

					{/* Erro de autenticação devolvido pelo contrato */}
					{errorMessage ? (
						<p
							role="alert"
							className="rounded-xl border border-brand-500/30 bg-brand-50 p-3 text-xs font-semibold text-brand-600"
						>
							{errorMessage}
						</p>
					) : null}

					{/* Botão de Entrar */}
					<Button
						type="submit"
						variant="brand"
						size="lg"
						disabled={login.isPending}
						aria-busy={login.isPending}
						className="w-full text-sm font-bold shadow-md shadow-brand-500/20 py-3.5 disabled:opacity-60"
					>
						ENTRAR NO PAINEL DE LEADS →
					</Button>

					{/* Link de Ativação / Primeiro Acesso */}
					<div className="flex justify-center -mt-1">
						<Link
							to="/ativar-conta"
							className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
						>
							Primeiro acesso? Ativar conta
						</Link>
					</div>

					{/* Caixa de Segurança Criptografada Verde */}
					<div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-start gap-3">
						<span className="text-base leading-none">🔒</span>
						<div>
							<p className="text-xs font-bold text-emerald-800">
								🔒 Conexão Criptografada e Segura
							</p>
							<p className="mt-0.5 text-[11px] leading-relaxed text-emerald-700">
								Ambiente protegido por protocolo SSL/TLS com armazenamento
								seguro de credenciais.
							</p>
						</div>
					</div>
				</div>
			</form>
		</PublicShell>
	);
}
