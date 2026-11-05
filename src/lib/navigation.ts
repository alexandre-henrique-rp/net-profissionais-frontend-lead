import type { OperationalRole } from "./session";

/**
 * Rotas do MVP por papel.
 *
 * Fonte: board `00-L.Navigation` da página `04. Ligth` do Penpot. O MVP tem
 * **4 rotas de tela** — Dashboard, Pool de Leads, Funil e Usuários — e o
 * Vendedor ainda tem as duas visões do funil (Kanban e Lista) na mesma rota,
 * diferenciadas pelo parâmetro `view` da URL.
 */
export interface NavItem {
	to: string;
	label: string;
	icon: string;
	badge?: number;
	/** Chave de contador real resolvida pela sidebar (pool, usuários pendentes). */
	badgeKey?: "pool" | "users-pending";
	/** Parâmetros de URL que o item exige para contar como ativo. */
	search?: Record<string, string>;
}

export interface NavGroup {
	title: string;
	items: NavItem[];
}

export const NAVIGATION: Record<OperationalRole, NavGroup[]> = {
	ADMIN: [
		{
			title: "OPERAÇÃO COMERCIAL",
			items: [
				{ to: "/dashboard", label: "Dashboard Comercial", icon: "📈" },
				{
					to: "/leads-pool",
					label: "Pool de Leads",
					icon: "📥",
					badgeKey: "pool",
				},
				{ to: "/pipeline", label: "Funil de Vendas", icon: "📊" },
			],
		},
		{
			title: "GESTÃO DA EQUIPE",
			items: [
				{
					to: "/users",
					label: "Usuários & Permissões",
					icon: "👥",
					badgeKey: "users-pending",
				},
			],
		},
	],
	VENDEDOR: [
		{
			title: "OPERAÇÃO COMERCIAL",
			items: [
				{ to: "/dashboard", label: "Dashboard do Vendedor", icon: "📊" },
				{
					to: "/leads-pool",
					label: "Pool de Leads",
					icon: "📥",
					badgeKey: "pool",
				},
				{
					to: "/pipeline",
					label: "Meu Funil (Kanban)",
					icon: "📋",
					badge: 16,
					search: { view: "kanban" },
				},
				{
					to: "/pipeline",
					label: "Lista de Leads",
					icon: "📑",
					search: { view: "lista" },
				},
			],
		},
	],
	CAPTADOR: [
		{
			title: "PROSPECÇÃO & ENTRADA",
			items: [
				{ to: "/dashboard", label: "Dashboard do Captador", icon: "📈" },
				{
					to: "/leads-pool",
					label: "Pool de Leads",
					icon: "📥",
					badgeKey: "pool",
				},
				{
					to: "/leads-pool",
					label: "Novo Lead (Busca CNPJ)",
					icon: "🏢",
					search: { novo: "1" },
				},
			],
		},
	],
};
