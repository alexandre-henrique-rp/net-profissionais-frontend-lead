import { Link, useRouterState } from "@tanstack/react-router";
import { NAVIGATION } from "../../lib/navigation";
import { ROLE_LABELS, type Session, useLogout } from "../../lib/session";
import { Avatar } from "../ui/Avatar";

export interface SidebarProps {
	session: Session;
	mobileOpen?: boolean;
	onMobileClose?: () => void;
}

/** O item está ativo quando a rota bate e os parâmetros exigidos batem. */
function isActive(
	item: { to: string; search?: Record<string, string> },
	pathname: string,
	search: Record<string, string>,
): boolean {
	if (item.to !== pathname) return false;
	if (!item.search) return true;

	return Object.entries(item.search).every(
		([key, value]) => search[key] === value,
	);
}

/**
 * Sidebar por papel.
 *
 * Fonte estrita: board `00-L.Navigation` (id: 567665a2-8132-805e-8008-d4817db2b688)
 * da página `04. Ligth` do Penpot.
 *
 * Características oficiais do Penpot:
 * - Largura: 250px (w-[250px])
 * - Itens de menu com 36px de altura (h-9, w-[226px])
 * - Item inativo: texto #475569 com badge cinza (#e2e8f0)
 * - Item ativo: fundo destacado com borda e badge ativo
 * - Rodapé: Cartão de perfil com iniciais, nome e papel oficial com bolinha verde
 * - Sem telas/widgets fantasmas de SMTP, IA ou Pool Público externo
 */
export function Sidebar({
	session,
	mobileOpen = false,
	onMobileClose,
}: SidebarProps) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const search = useRouterState({
		select: (state) => state.location.search as Record<string, string>,
	});
	const groups = NAVIGATION[session.operationalRole];
	const logout = useLogout();

	return (
		<>
			{mobileOpen ? (
				<button
					type="button"
					aria-label="Fechar menu"
					onClick={onMobileClose}
					className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
				/>
			) : null}
			<aside
				className={`${
					mobileOpen
						? "fixed inset-y-0 left-0 z-50 flex shadow-2xl"
						: "hidden lg:flex"
				} min-h-0 w-[250px] shrink-0 flex-col border-r border-[#e2e8f0] bg-white lg:h-full`}
			>
				{mobileOpen ? (
					<div className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-3">
						<span className="text-sm font-bold text-slate-800">Navegação</span>
						<button
							type="button"
							onClick={onMobileClose}
							className="rounded-lg p-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
						>
							✕ Fechar
						</button>
					</div>
				) : null}

				{/* Lista de Grupos de Navegação */}
				<nav className="flex flex-1 flex-col gap-5 px-3 py-4 overflow-y-auto">
					{groups.map((group) => (
						<div key={group.title}>
							<p className="px-3 pb-2 text-[11px] font-bold tracking-wider text-[#94a3b8] uppercase">
								{group.title}
							</p>
							<ul className="flex flex-col gap-1">
								{group.items.map((item) => {
									const active = isActive(item, pathname, search);

									return (
										<li key={`${item.to}-${item.label}`}>
											<Link
												to={item.to}
												search={item.search}
												onClick={onMobileClose}
												aria-current={active ? "page" : undefined}
												className={`flex h-9 w-[226px] mx-auto items-center gap-2.5 rounded-lg border px-3 text-[13px] transition-colors ${
													active
														? "border-brand-500 bg-brand-50 font-bold text-brand-600 shadow-xs"
														: "border-transparent font-medium text-[#475569] hover:bg-slate-50 hover:text-slate-900"
												}`}
											>
												<span aria-hidden className="text-sm leading-none">
													{item.icon}
												</span>
												<span className="truncate">{item.label}</span>
												{item.badge ? (
													<span
														className={`ml-auto rounded-md px-2 py-0.5 text-[11px] font-bold ${
															active
																? "bg-brand-500 text-white"
																: "bg-[#e2e8f0] text-[#475569]"
														}`}
													>
														{item.badge}
													</span>
												) : null}
											</Link>
										</li>
									);
								})}
							</ul>
						</div>
					))}
				</nav>

				{/* Cartão de Perfil no Rodapé da Sidebar */}
				<div className="mx-3 mb-3 mt-auto flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
					<Avatar name={session.name} tone="brand" size="sm" />
					<div className="min-w-0 flex-1 leading-tight text-left">
						<p className="truncate text-[13px] font-bold text-[#0f172a]">
							{session.name}
						</p>
						<p className="truncate text-[11px] font-semibold text-emerald-600">
							● {ROLE_LABELS[session.operationalRole]}
						</p>
					</div>
					<button
						type="button"
						aria-label="Sair da conta"
						title="Sair da conta"
						disabled={logout.isPending}
						onClick={() => logout.mutate()}
						className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-[#475569] transition-colors hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
					>
						Sair
					</button>
				</div>
			</aside>
		</>
	);
}
