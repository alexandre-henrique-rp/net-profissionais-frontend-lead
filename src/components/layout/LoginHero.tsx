import { useColorScheme } from "../../lib/theme";

interface Feature {
	icon: string;
	title: string;
	description: string;
}

const FEATURES: Feature[] = [
	{
		icon: "🏢",
		title: "Enriquecimento Automático de Dados",
		description:
			"Identificação instantânea de empresas com Razão Social, sócios e dados cadastrais.",
	},
	{
		icon: "🎯",
		title: "Funil Comercial & Gestão Ágil",
		description:
			"Pipeline visual intuitivo com histórico de interações e acionamento direto via WhatsApp.",
	},
	{
		icon: "🔐",
		title: "Segurança Avançada & Privacidade",
		description:
			"Acesso protegido por perfil de usuário, criptografia de dados e total conformidade com a LGPD.",
	},
];

/**
 * Herói da marca das telas públicas.
 *
 * Fonte: board `Tela 01-L` da página `04. Ligth` do Penpot.
 */
export function LoginHero() {
	const { scheme } = useColorScheme();

	return (
		<div className="flex h-full flex-col">
			<header className="flex h-[51px] items-start gap-[10px]">
				<img
					src="/NP07.svg"
					alt=""
					aria-hidden="true"
					className="h-[51px] w-16"
				/>
				<div className="flex flex-col">
					<img
						src={scheme === "dark" ? "/NP08-dark.svg" : "/NP08-light.svg"}
						alt="NETProfissional — Tecnologia para sua empresa"
						className="h-[39px] w-[248px] max-w-full object-contain object-left"
					/>
				</div>
			</header>

			<div className="mt-[61px]">
				<div className="inline-flex h-7 w-[320px] max-w-full items-center rounded-full border border-brand-500 bg-brand-50 px-[10px] text-[11px] font-semibold text-brand-600 dark:text-rose-300">
					PROSPECÇÃO B2B • GESTÃO INTELIGENTE DE LEADS
				</div>

				<h1 className="mt-[18px] w-[372px] max-w-full text-[38px] font-normal leading-[1.2] tracking-tight text-brand-ink">
					Gerador e Gerenciador
					<br />
					<span className="text-brand-500">Inteligente de Leads</span>
				</h1>

				<p className="mt-4 w-[374px] max-w-full text-[15px] leading-[24px] text-brand-ink">
					Acelere as vendas da sua empresa com prospecção ativa, enriquecimento
					automático de CNPJ e funil comercial ágil.
				</p>

				<ul className="mt-[38px] flex flex-col gap-4">
					{FEATURES.map((feature) => (
						<li
							key={feature.title}
							className="flex h-[82px] w-[560px] max-w-full items-center gap-3 rounded-xl border border-line bg-canvas px-[17px] shadow-[0_4px_14px_rgba(0,0,0,0.07)]"
						>
							<span
								aria-hidden
								className="flex h-[46px] w-[50px] shrink-0 items-center justify-center rounded-[10px] border border-brand-500 bg-brand-50 text-xl"
							>
								{feature.icon}
							</span>
							<div className="min-w-0 xl:min-w-[489px]">
								<span className="block text-[15px] leading-[18px] text-ink-strong">
									{feature.title}
								</span>
								<span className="mt-1 block text-[12px] leading-[15px] text-ink-muted">
									{feature.description}
								</span>
							</div>
						</li>
					))}
				</ul>
			</div>

			<p className="mt-auto pt-6 text-[12px] leading-[15px] text-ink-muted">
				© 2026 NetProfissional Tecnologia • Todos os direitos reservados •
				Política de Privacidade
			</p>
		</div>
	);
}
