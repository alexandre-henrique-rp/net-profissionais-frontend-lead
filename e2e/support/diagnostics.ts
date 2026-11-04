import type { Page, TestInfo } from "@playwright/test";

function safePath(rawUrl: string): string {
	try {
		const url = new URL(rawUrl);
		return `${url.origin}${url.pathname}`;
	} catch {
		return "[invalid-url]";
	}
}

function redact(value: string): string {
	return value.replace(
		/(password|token|secret)=([^\s&]+)/gi,
		"$1=[REDACTED]",
	);
}

export function watchBrowserDiagnostics(page: Page): string[] {
	const entries: string[] = [];

	page.on("console", (message) => {
		if (message.type() === "error") {
			entries.push(`[console] ${redact(message.text())}`);
		}
	});
	page.on("pageerror", (error) => {
		entries.push(`[pageerror] ${redact(error.message)}`);
	});
	page.on("requestfailed", (request) => {
		entries.push(
			`[requestfailed] ${request.method()} ${safePath(request.url())} ${request.failure()?.errorText ?? ""}`,
		);
	});
	page.on("response", (response) => {
		const path = safePath(response.url());

		if (response.status() >= 400 && !(response.status() === 401 && path.endsWith("/auth/me"))) {
			entries.push(`[http ${response.status()}] ${response.request().method()} ${path}`);
		}
	});

	return entries;
}

export async function attachBrowserDiagnostics(
	page: Page,
	testInfo: TestInfo,
	entries: string[],
): Promise<void> {
	if (testInfo.status === testInfo.expectedStatus) {
		return;
	}

	await testInfo.attach("browser-diagnostics.txt", {
		body: Buffer.from(entries.length > 0 ? entries.join("\n") : "No browser errors captured."),
		contentType: "text/plain",
	});

	await testInfo.attach("failure-screenshot.png", {
		body: await page.screenshot({ fullPage: true }),
		contentType: "image/png",
	});
}
