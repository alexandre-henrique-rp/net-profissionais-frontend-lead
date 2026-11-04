import { describe, expect, it, vi } from "vitest";
import {
	API_BASE_URL,
	ApiError,
	apiDownload,
	apiFetch,
	buildQueryString,
	filenameFromDisposition,
} from "#/lib/api";
import { installApiMock, mockFailures } from "#/test/apiMock";

describe("cliente HTTP", () => {
	it("@spec:AC-133 usa o prefixo da API e envia o cookie de sessão", async () => {
		const api = installApiMock();

		await apiFetch("/leads/pool", { query: { page: 2, uf: "MG", sector: "" } });

		const [url, init] = api.fetch.mock.calls[0];

		expect(String(url)).toBe(`${API_BASE_URL}/leads/pool?page=2&uf=MG`);
		expect(init?.credentials).toBe("include");
		// Valor vazio não vira `sector=`.
		expect(String(url)).not.toContain("sector");
	});

	it("@spec:AC-134 desembrulha o envelope de sucesso", async () => {
		installApiMock();

		const page = await apiFetch<{ items: unknown[]; meta: { total: number } }>(
			"/leads/pool",
		);

		expect(page.items).toHaveLength(4);
		expect(page.meta.total).toBe(4);
	});

	it("@spec:AC-135 transforma o erro do backend em ApiError tipado", async () => {
		installApiMock({
			"PATCH /leads/:id/stage": () => ({
				status: 409,
				body: {
					success: false,
					error: {
						code: "VERSION_CONFLICT",
						message: "O card foi alterado por outra pessoa.",
						details: { current_version: 4 },
						timestamp: "2026-10-26T12:00:00.000Z",
					},
				},
			}),
		});

		const error = await apiFetch("/leads/abc/stage", {
			method: "PATCH",
			body: { stage_id: "etapa-2", version: 3 },
		}).catch((failure: unknown) => failure);

		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({
			status: 409,
			code: "VERSION_CONFLICT",
			message: "O card foi alterado por outra pessoa.",
			details: { current_version: 4 },
		});
	});

	it("@spec:AC-136 falha de rede vira mensagem em português", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
		);

		const error = await apiFetch("/users").catch((failure: unknown) => failure);

		expect(error).toBeInstanceOf(ApiError);
		expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
		expect((error as ApiError).message).not.toContain("Failed to fetch");
		expect((error as ApiError).message).toContain("servidor");
	});

	it("@spec:AC-137 baixa o arquivo e lê o nome do Content-Disposition", async () => {
		installApiMock();

		const file = await apiDownload("/leads/export", {
			query: { format: "csv" },
		});

		expect(file.filename).toBe("leads.csv");
		expect(await file.blob.text()).toContain("razao_social");
	});

	it("@spec:AC-137 recusa o download quando a API responde erro", async () => {
		installApiMock({
			"GET /leads/export": () => mockFailures.validation("Período inválido."),
		});

		const error = await apiDownload("/leads/export").catch(
			(failure: unknown) => failure,
		);

		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).code).toBe("VALIDATION_ERROR");
	});
});

describe("utilitários do cliente", () => {
	it("monta a query string sem valores vazios", () => {
		expect(
			buildQueryString({ a: 1, b: "x", c: undefined, d: null, e: "" }),
		).toBe("?a=1&b=x");
		expect(buildQueryString()).toBe("");
	});

	it("lê o nome do arquivo nos dois formatos de Content-Disposition", () => {
		expect(filenameFromDisposition('attachment; filename="leads.csv"')).toBe(
			"leads.csv",
		);
		expect(
			filenameFromDisposition(
				"attachment; filename*=UTF-8''relat%C3%B3rio.pdf",
			),
		).toBe("relatório.pdf");
		expect(filenameFromDisposition(null)).toBeNull();
	});
});
