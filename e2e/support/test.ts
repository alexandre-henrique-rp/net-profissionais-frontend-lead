import { expect, test as base } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";

interface UsabilityFixtures {
	diagnostics: void;
}

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

function collectBrowserDiagnostics(page: Page): string[] {
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
		const isExpectedSessionProbe =
			response.status() === 401 && path.endsWith("/auth/me");

		if (response.status() >= 400 && !isExpectedSessionProbe) {
			entries.push(
				`[http ${response.status()}] ${response.request().method()} ${path}`,
			);
		}
	});

	return entries;
}

async function attachFailureDiagnostics(
	page: Page,
	testInfo: TestInfo,
	entries: string[],
): Promise<void> {
	if (testInfo.status === testInfo.expectedStatus) {
		return;
	}

	await testInfo.attach("browser-diagnostics.txt", {
		body: Buffer.from(
			entries.length > 0 ? entries.join("\n") : "No browser errors captured.",
		),
		contentType: "text/plain",
	});

	try {
		await testInfo.attach("failure-screenshot.png", {
			body: await page.screenshot({ fullPage: true }),
			contentType: "image/png",
		});
	} catch {
		entries.push("Screenshot indisponível: a página já estava fechada.");
	}
}

export const test = base.extend<UsabilityFixtures>({
	diagnostics: [
		async ({ page }, use, testInfo) => {
			const entries = collectBrowserDiagnostics(page);
			await use();
			await attachFailureDiagnostics(page, testInfo, entries);
		},
		{ auto: true },
	],
});

export { expect };
