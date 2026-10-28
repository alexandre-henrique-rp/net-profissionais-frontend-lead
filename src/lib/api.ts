/**
 * Cliente HTTP único do frontend.
 *
 * Todas as telas falam com o backend por aqui: a URL base, o cookie de sessão,
 * o envelope de sucesso e o formato de erro ficam num lugar só. Nenhum
 * componente chama `fetch` diretamente.
 */

/** Base da API. `VITE_API_URL` permite apontar para outro ambiente. */
export const API_BASE_URL: string =
	import.meta.env.VITE_API_URL?.replace(/\/+$/, "") ??
	"http://localhost:3000/api/v1";

/** Valor aceito na query string. `undefined`, `null` e `""` são omitidos. */
export type QueryValue = string | number | boolean | null | undefined;

/** Corpo de erro do contrato do backend. */
export interface ApiErrorBody {
	code: string;
	message: string;
	details?: unknown;
	retry_after_seconds?: number;
	timestamp?: string;
}

/** Metadados de uma listagem paginada. */
export interface PageMeta {
	page: number;
	limit: number;
	total: number;
	has_more: boolean;
}

/** Resposta paginada padrão (`{ items, meta }`). */
export interface ApiPage<T> {
	items: T[];
	meta: PageMeta;
}

/** Códigos de erro padrão quando o corpo não traz um código próprio. */
const STATUS_CODES: Readonly<Record<number, string>> = {
	400: "VALIDATION_ERROR",
	401: "UNAUTHORIZED",
	403: "FORBIDDEN",
	404: "NOT_FOUND",
	409: "CONFLICT",
	410: "GONE",
	422: "UNPROCESSABLE_ENTITY",
	429: "RATE_LIMIT_EXCEEDED",
	500: "INTERNAL_ERROR",
	503: "SERVICE_UNAVAILABLE",
};

/** Erro de API: o `code` é o que a tela usa para decidir o que mostrar. */
export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly details?: unknown;
	readonly retryAfterSeconds?: number;

	constructor(
		status: number,
		code: string,
		message: string,
		details?: unknown,
		retryAfterSeconds?: number,
	) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
		this.details = details;
		this.retryAfterSeconds = retryAfterSeconds;
	}
}

export interface ApiRequestOptions {
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	body?: unknown;
	query?: Record<string, QueryValue>;
	signal?: AbortSignal;
}

/** Monta `?a=1&b=2` descartando valores vazios. */
export function buildQueryString(query?: Record<string, QueryValue>): string {
	if (!query) {
		return "";
	}

	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null || value === "") {
			continue;
		}

		params.set(key, String(value));
	}

	const serialized = params.toString();

	return serialized === "" ? "" : `?${serialized}`;
}

/** URL absoluta de um endpoint, com a query aplicada. */
export function resolveApiUrl(
	path: string,
	query?: Record<string, QueryValue>,
): string {
	const normalized = path.startsWith("/") ? path : `/${path}`;

	return `${API_BASE_URL}${normalized}${buildQueryString(query)}`;
}

interface SuccessEnvelope<T> {
	success: true;
	data: T;
}

interface FailureEnvelope {
	success: false;
	error: ApiErrorBody;
}

function isEnvelope(value: unknown): value is SuccessEnvelope<unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		"success" in value &&
		"data" in value
	);
}

function isFailureEnvelope(value: unknown): value is FailureEnvelope {
	return (
		typeof value === "object" &&
		value !== null &&
		"success" in value &&
		(value as { success: unknown }).success === false
	);
}

/** Corpo como JSON; texto que não é JSON volta como string; vazio vira `null`. */
async function readBody(response: Response): Promise<unknown> {
	const text = await response.text();

	if (text === "") {
		return null;
	}

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function toApiError(response: Response, payload: unknown): ApiError {
	const body = isFailureEnvelope(payload) ? payload.error : undefined;
	const status = response.status;

	return new ApiError(
		status,
		body?.code ?? STATUS_CODES[status] ?? `HTTP_${status}`,
		body?.message ?? `A requisição falhou (${status}).`,
		body?.details,
		body?.retry_after_seconds,
	);
}

/**
 * Envia a requisição.
 *
 * Falha antes da resposta (DNS, servidor fora do ar, CORS) não tem status HTTP
 * e viraria `Failed to fetch` na tela; aqui vira um `ApiError` em português.
 */
async function send(
	path: string,
	options: ApiRequestOptions = {},
): Promise<Response> {
	const { method = "GET", body, query, signal } = options;

	const headers: Record<string, string> = {};
	if (body !== undefined) {
		headers["Content-Type"] = "application/json";
	}

	try {
		return await fetch(resolveApiUrl(path, query), {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			// O cookie `np_session` é HttpOnly: só o navegador o envia.
			credentials: "include",
			signal,
		});
	} catch (error) {
		// Cancelamento é intencional (troca de filtro, unmount) e não é erro.
		if (error instanceof DOMException && error.name === "AbortError") {
			throw error;
		}

		throw new ApiError(
			0,
			"NETWORK_ERROR",
			"Não foi possível falar com o servidor. Verifique a conexão e tente de novo.",
		);
	}
}

/**
 * Chamada JSON: devolve o conteúdo de `data` quando a resposta vem no envelope.
 *
 * Rotas fora do envelope (healthcheck) continuam funcionando: o corpo cru é
 * devolvido como está.
 */
export async function apiFetch<T>(
	path: string,
	options: ApiRequestOptions = {},
): Promise<T> {
	const response = await send(path, options);
	const payload = await readBody(response);

	if (!response.ok) {
		throw toApiError(response, payload);
	}

	if (isEnvelope(payload)) {
		return payload.data as T;
	}

	return payload as T;
}

/** Nome do arquivo no `Content-Disposition` (com ou sem `filename*`). */
export function filenameFromDisposition(header: string | null): string | null {
	if (!header) {
		return null;
	}

	const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
	if (encoded) {
		try {
			return decodeURIComponent(encoded[1]);
		} catch {
			return encoded[1];
		}
	}

	const plain = /filename="?([^";]+)"?/i.exec(header);

	return plain ? plain[1].trim() : null;
}

export interface DownloadedFile {
	blob: Blob;
	filename: string;
}

/**
 * Baixa um arquivo binário (CSV/PDF).
 *
 * Não passa pelo desembrulho de JSON: o corpo é o arquivo. O nome sai do
 * `Content-Disposition`; sem ele, usa o fallback informado.
 */
export async function apiDownload(
	path: string,
	options: ApiRequestOptions & { fallbackFilename?: string } = {},
): Promise<DownloadedFile> {
	const { fallbackFilename = "export.csv", ...request } = options;
	const response = await send(path, request);

	if (!response.ok) {
		const payload = await readBody(response);

		throw toApiError(response, payload);
	}

	return {
		blob: await response.blob(),
		filename:
			filenameFromDisposition(response.headers.get("content-disposition")) ??
			fallbackFilename,
	};
}

/** Entrega o arquivo ao navegador (download real). */
export function saveDownloadedFile(file: DownloadedFile): void {
	const url = URL.createObjectURL(file.blob);
	const anchor = document.createElement("a");

	anchor.href = url;
	anchor.download = file.filename;
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}
