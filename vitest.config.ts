import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Config de testes do frontend.
 *
 * Mantida separada da `vite.config.ts` de propósito: os testes não precisam do
 * plugin de roteamento (o routeTree gerado já está versionado) nem do devtools.
 */
export default defineConfig({
	plugins: [react()],
	resolve: {
		// Mesmo atalho do `tsconfig.json`: `#/components/...` → `src/components/...`.
		tsconfigPaths: true,
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/**/*.{ts,tsx}"],
			exclude: ["src/routeTree.gen.ts", "src/test/**"],
		},
	},
});
