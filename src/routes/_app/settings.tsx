import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "#/lib/session";

export const Route = createFileRoute("/_app/settings")({
	beforeLoad: async () => {
		const session = await getSession();

		if (session?.role !== "ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: () => <Outlet />,
});
