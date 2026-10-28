import { useEffect, useRef, useState } from "react";
import { LeadFormDialog } from "../../features/leads/LeadFormDialog";
import type { PoolLeadItem } from "../../features/leads-pool/data";
import { ROLE_LABELS, type Session } from "../../lib/session";
import { Avatar } from "../ui/Avatar";

export interface TopbarProps {
	session: Session;
	onMenuToggle?: () => void;
}

/**
 * Topbar global da aplicação.
 *
 * Fonte estrita e exata: board `00-L.Navigation — Componentes Globais de Navegação (Sidebar & Topbar • Light)`
 * (id: 567665a2-8132-805e-8008-d4817db2b688) na página `04. Ligth` do Penpot.
 *
 * Medidas e estilos normativos:
 * - Altura: 56px (h-14), fundo branco (#ffffff), borda inferior #e2e8f0.
 * - Área da esquerda (250px, alinhada com a sidebar):
 *   - Botão ☰ (x=140)
 *   - Logo NP (x=176, w=40, h=32)
 * - Área central (a partir dos 250px):
 *   - Botão "+ Novo Lead" (x=370, w=116, h=36, bg=#2563eb, text=#ffffff, rounded-[6px], font-bold)
 *   - Botão "☀️ Light" (x=496, w=80, h=36, bg=#f1f5f9, text=#334155, border=#e2e8f0, rounded-[6px])
 *   - Campo de busca global (x=586, w=470, h=36, bg=#f8fafc, border=#e2e8f0, text=#64748b, rounded-[6px])
 * - Área da direita:
 *   - Chip "🏢 Corporação: NetProfissional" (x=1068, w=216, h=36, bg=#f1f5f9, border=#e2e8f0, text=#1e293b, rounded-[6px])
 *   - Perfil do usuário (x=1300, w=144, h=36):
 *     - Avatar circular 36px com fundo #4f46e5 e iniciais em branco
 *     - Nome "Alexandre Henrique" (#0f172a, font-bold, text-[13px])
 *     - Papel "● Administrador Geral" (#10b981, font-semibold, text-[11px])
 */
export function Topbar({ session, onMenuToggle }: TopbarProps) {
	const searchRef = useRef<HTMLInputElement>(null);
	const [createOpen, setCreateOpen] = useState(false);
	const [notice, setNotice] = useState("");

	useEffect(() => {
		function handleShortcut(event: KeyboardEvent) {
			if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				searchRef.current?.focus();
			}
		}
		window.addEventListener("keydown", handleShortcut);
		return () => window.removeEventListener("keydown", handleShortcut);
	}, []);

	function saveLead(lead: PoolLeadItem) {
		setCreateOpen(false);
		setNotice(
			`${lead.lead.companyName ?? lead.lead.tradeName ?? "Lead"} foi incluído no Pool de Leads.`,
		);
	}

	return (
		<>
			<header className="sticky top-0 z-30 flex h-14 w-full items-center border-b border-[#e2e8f0] bg-white px-4 sm:px-6">
				{/* Seção da esquerda: 250px alinhada rigorosamente com a Sidebar */}
				<div className="flex w-[250px] shrink-0 items-center gap-3">
					<button
						type="button"
						aria-label="Abrir menu"
						onClick={onMenuToggle}
						className="flex size-9 items-center justify-center rounded-lg text-lg text-[#64748b] hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-[#2563eb] lg:hidden"
					>
						☰
					</button>

					<div className="flex h-8 w-10 shrink-0 items-center justify-center overflow-visible">
						<img
							src="/NP07-transparent.png"
							alt="NetProfissional"
							className="h-8 w-10 object-contain"
						/>
					</div>
				</div>

				{/* Seção central: Ações e Busca */}
				<div className="flex flex-1 items-center gap-2.5">
					{/* Botão + Novo Lead (Azul #2563eb do Penpot) */}
					<button
						type="button"
						onClick={() => setCreateOpen(true)}
						className="inline-flex h-9 w-[116px] shrink-0 items-center justify-center rounded-[6px] bg-[#2563eb] text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-[#2563eb]"
					>
						+ Novo Lead
					</button>

					{/* Botão ☀️ Light */}
					<button
						type="button"
						className="hidden h-9 w-[80px] shrink-0 items-center justify-center rounded-[6px] border border-[#e2e8f0] bg-[#f1f5f9] text-xs font-semibold text-[#334155] transition-colors hover:bg-slate-200/80 sm:inline-flex"
					>
						☀️ Light
					</button>

					{/* Campo de Busca Global Ctrl+K */}
					<div className="relative hidden min-w-0 flex-1 md:block md:max-w-[470px]">
						<input
							ref={searchRef}
							type="search"
							aria-label="Buscar lead por nome, razão social, CNPJ, WhatsApp"
							placeholder="🔍 Buscar lead por nome, razão social, CNPJ, WhatsApp... [Ctrl+K]"
							className="h-9 w-full rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-xs text-slate-800 outline-none placeholder:text-[#64748b] focus:border-[#2563eb] focus:bg-white"
						/>
					</div>
				</div>

				{/* Seção da direita: Chip Corporativo e Perfil */}
				<div className="ml-auto flex items-center gap-4">
					{/* Chip Corporativo (w=216px, h=36px) */}
					<div className="hidden h-9 w-[216px] shrink-0 items-center justify-center rounded-[6px] border border-[#e2e8f0] bg-[#f1f5f9] text-xs font-semibold text-[#1e293b] sm:flex">
						🏢 Corporação: NetProfissional
					</div>

					{/* Cartão de Perfil na Topbar */}
					<div className="flex h-9 items-center gap-2.5">
						<Avatar name={session.name} tone="brand" size="sm" />
						<div className="hidden text-left leading-tight sm:block">
							<p className="text-[13px] font-bold text-[#0f172a]">
								{session.name}
							</p>
							<p className="text-[11px] font-semibold text-[#10b981]">
								● {ROLE_LABELS[session.operationalRole]}
							</p>
						</div>
					</div>
				</div>
			</header>

			{notice ? (
				<output className="fixed right-4 top-16 z-40 rounded-lg border border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-md">
					{notice}
				</output>
			) : null}

			<LeadFormDialog
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				onCreated={saveLead}
			/>
		</>
	);
}
