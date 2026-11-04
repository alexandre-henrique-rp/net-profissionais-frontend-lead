/** Treats missing and whitespace-only text as absent, returning trimmed text. */
export function firstNonBlankText(
	...values: Array<string | null | undefined>
): string | null {
	for (const value of values) {
		const normalized = value?.trim();
		if (normalized) {
			return normalized;
		}
	}

	return null;
}

export function displayText(
	value: string | null | undefined,
	fallback: string,
): string {
	return firstNonBlankText(value) ?? fallback;
}

/** Preserves zero; invalid/non-finite numbers use the supplied fallback. */
export function finiteNumberOr(
	value: number | null | undefined,
	fallback: number,
): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function finiteNumberOrNull(
	value: number | null | undefined,
): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}
