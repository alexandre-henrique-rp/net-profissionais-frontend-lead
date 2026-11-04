import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRoute } from "#/test/renderRoute";

describe("casca da aplicação", () => {
	it("@spec:AC-184 mantém navegação fixa e limita a rolagem ao conteúdo", async () => {
		renderRoute("/leads-pool");

		const topbar = await screen.findByRole("banner");
		const sidebar = screen.getByRole("complementary");
		const content = screen.getByRole("main");
		const viewport = content.parentElement?.parentElement;

		expect(viewport).toHaveClass("h-dvh", "w-screen", "overflow-hidden");
		expect(topbar).toHaveClass("sticky", "top-0");
		expect(sidebar).toHaveClass("lg:h-full");
		expect(content).toHaveClass("min-h-0", "overflow-y-auto");
	});
});
