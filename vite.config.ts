import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackRouter } from "@tanstack/router-plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		tailwindcss(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
			// Arquivos de teste vivem junto das rotas (co-located) e não são rotas.
			routeFileIgnorePattern: "\\.test\\.",
		}),
		viteReact(),
	],
});

export default config;
