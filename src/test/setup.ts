import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { queryClient } from "#/lib/query-client";
import { installApiMock } from "./apiMock";

/**
 * O overlay de devtools do TanStack é UI de desenvolvimento e não faz parte do
 * que os testes verificam — e ele lança no unmount do jsdom.
 */
vi.mock("@tanstack/react-devtools", () => ({
	TanStackDevtools: () => null,
}));

// jsdom não implementa scroll; o router usa para restauração de rolagem.
Object.defineProperty(window, "scrollTo", { value: () => {}, writable: true });

// jsdom não implementa download por `URL.createObjectURL`.
if (typeof URL.createObjectURL !== "function") {
	Object.defineProperty(URL, "createObjectURL", {
		value: () => "blob:teste",
		writable: true,
	});
	Object.defineProperty(URL, "revokeObjectURL", {
		value: () => {},
		writable: true,
	});
}

/**
 * Nenhum teste fala com um servidor real: `fetch` é substituído pelo dublê de
 * `apiMock.ts` e o cache de queries é limpo para um teste não herdar a sessão
 * (ou a lista) do anterior.
 */
beforeEach(() => {
	queryClient.clear();
	installApiMock();
});

afterEach(() => {
	cleanup();
	queryClient.clear();
	vi.restoreAllMocks();
});
