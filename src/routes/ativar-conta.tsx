import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useMemo, useState } from "react";
import { LoginHero } from "#/components/layout/LoginHero";
import { PublicShell } from "#/components/layout/PublicShell";
import { Button } from "#/components/ui/Button";
import { Field, TextInput } from "#/components/ui/Field";
import { apiFetch } from "#/lib/api";

export const Route = createFileRoute("/ativar-conta")({
	validateSearch: (search: Record<string, unknown>): { token?: string } => ({
		token:
			typeof search.token === "string" && search.token !== ""
				? search.token
				: undefined,
	}),
	component: ActivateAccountPage,
});

function ActivateAccountPage() {
	const { token = "" } = Route.useSearch();
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
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

	/** O convite é de uso único: o token vem da URL e sai do banco na ativação. */
	const activate = useMutation({
		mutationFn: () =>
			apiFetch<{ activated: true }>("/auth/activate-account", {
				method: "POST",
				body: { token, password },
			}),
		onSuccess: () => navigate({ to: "/login" }),
	});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (passwordIsValid && matches) {
			activate.mutate();
		}
	}

	return (
		<PublicShell hero={<LoginHero />}>
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl"
			>
				{/* Barra vermelha de topo do Penpot Tela 01-C-L */}
				<div className="h-1.5 w-full bg-brand-500" />

				<div className="flex flex-col gap-5 p-7 sm:p-9">
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
							⏳ Convite 48h
						</span>
					</div>

					<div>
						<h2 className="text-2xl font-bold tracking-tight text-slate-900">
							Ativar conta
						</h2>
						<p className="mt-1 text-[13px] text-slate-500 leading-relaxed">
							Crie uma senha forte para concluir a ativação do seu acesso
							corporativo.
						</p>
					</div>

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

					<ul aria-label="Critérios da senha" className="grid gap-1.5 text-xs">
						{rules.map((rule) => (
							<li
								key={rule.label}
								className={`flex items-center gap-1.5 font-medium ${
									rule.valid ? "text-emerald-600" : "text-slate-400"
								}`}
							>
								<span aria-hidden className="font-bold">
									{rule.valid ? "✓" : "○"}
								</span>
								<span>{rule.label}</span>
							</li>
						))}
					</ul>

					<Field label="Confirmar senha">
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
						<p role="alert" className="-mt-3 text-xs font-bold text-brand-600">
							As senhas não correspondem.
						</p>
					) : null}

					{activate.isError ? (
						<p
							role="alert"
							className="rounded-xl border border-brand-500/30 bg-brand-50 p-3.5 text-xs font-semibold text-brand-600"
						>
							{activate.error instanceof Error
								? activate.error.message
								: "Não foi possível ativar a conta. Peça um novo convite."}
						</p>
					) : null}

					<Button
						type="submit"
						variant="brand"
						size="lg"
						disabled={!passwordIsValid || !matches || activate.isPending}
						className="w-full text-sm font-bold shadow-md shadow-brand-500/20 py-3.5 disabled:opacity-50"
					>
						Definir senha
					</Button>

					<div className="flex justify-center">
						<Link
							to="/login"
							className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
						>
							Voltar para o login
						</Link>
					</div>

					<div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-start gap-3">
						<span className="text-base leading-none">🔒</span>
						<div>
							<p className="text-xs font-bold text-emerald-800">
								Proteção de Credenciais
							</p>
							<p className="mt-0.5 text-[11px] leading-relaxed text-emerald-700">
								Senhas criptografadas com Argon2id de alta resistência.
							</p>
						</div>
					</div>
				</div>
			</form>
		</PublicShell>
	);
}
