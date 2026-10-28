interface Feature {
	icon: string;
	title: string;
	description: string;
	iconBg: string;
}

const FEATURES: Feature[] = [
	{
		icon: "⚡",
		title: "Enriquecimento Automático de Dados",
		description:
			"Identificação instantânea de empresas com Razão Social, sócios, CNAE e dados cadastrais da Receita.",
		iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
	},
	{
		icon: "🎯",
		title: "Funil Comercial & Gestão Ágil",
		description:
			"Pipeline visual em 7 etapas estratégicas com histórico de interações e pontuação preditiva.",
		iconBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
	},
	{
		icon: "🔐",
		title: "Segurança Avançada & Privacidade",
		description:
			"Acesso protegido por perfil de usuário, isolamento estrito por tenant e total rastreabilidade.",
		iconBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
	},
];

/**
 * Herói da marca das telas públicas.
 *
 * Fonte: board `Tela 01-L` da página `04. Ligth` do Penpot.
 */
export function LoginHero() {
	return (
		<div className="flex h-full flex-col justify-between">
			<div className="flex flex-col">
				<div className="flex items-center gap-3">
					<div className="flex size-9 items-center justify-center rounded-lg bg-brand-500 text-sm font-black text-white shadow-sm">
						NP
					</div>
					<div>
						<span className="text-xl font-bold tracking-tight text-white">
							NETProfissional
						</span>
						<p className="text-[11px] font-medium text-slate-400">
							Gerador de Leads
						</p>
					</div>
				</div>

				<div className="mt-8">
					<span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/80 px-3.5 py-1.5 text-[11px] font-semibold text-slate-200">
						<span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
						PROSPECÇÃO B2B • GESTÃO INTELIGENTE DE LEADS
					</span>
				</div>

				<h1 className="mt-5 text-[36px] font-normal leading-[1.18] tracking-tight text-white xl:text-[42px]">
					Gerador e Gerenciador
					<br />
					<span className="font-bold text-brand-500">Inteligente de Leads</span>
				</h1>

				<p className="mt-4 max-w-xl text-[14px] leading-relaxed text-slate-300">
					Acelere as vendas da sua empresa com prospecção ativa, enriquecimento
					automático de CNPJ e funil comercial ágil.
				</p>

				<ul className="mt-8 flex flex-col gap-3.5">
					{FEATURES.map((feature) => (
						<li
							key={feature.title}
							className="flex items-center gap-4 rounded-xl border border-slate-800 bg-[#121c31]/70 p-3.5 backdrop-blur-xs transition-colors hover:border-slate-700"
						>
							<span
								aria-hidden
								className={`flex size-11 shrink-0 items-center justify-center rounded-lg border text-lg ${feature.iconBg}`}
							>
								{feature.icon}
							</span>
							<div>
								<span className="block text-[14px] font-bold text-white">
									{feature.title}
								</span>
								<span className="block text-[12px] leading-snug text-slate-400">
									{feature.description}
								</span>
							</div>
						</li>
					))}
				</ul>
			</div>

			<p className="mt-12 text-[11px] text-slate-500">
				© 2026 NetProfissional Tecnologia • Todos os direitos reservados •
				Política de Privacidade
			</p>
		</div>
	);
}
