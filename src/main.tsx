import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { getRouter, queryClient } from "./router";

const router = getRouter();

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Elemento #app não encontrado no index.html");
}

ReactDOM.createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
