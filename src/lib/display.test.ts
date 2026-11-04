import { describe, expect, it } from "vitest";
import {
	displayText,
	finiteNumberOr,
	finiteNumberOrNull,
	firstNonBlankText,
} from "./display";

describe("fallbacks de exibição", () => {
	it("@spec:AC-200 ignora texto nulo, vazio ou composto só por espaços", () => {
		expect(firstNonBlankText(null, "   ", "  Fantasia  ", "Razão social")).toBe(
			"Fantasia",
		);
		expect(displayText("   ", "Empresa sem nome")).toBe("Empresa sem nome");
	});

	it("@spec:AC-200 preserva zero e substitui números inválidos", () => {
		expect(finiteNumberOr(0, 7)).toBe(0);
		expect(finiteNumberOr(Number.NaN, 7)).toBe(7);
		expect(finiteNumberOrNull(Number.POSITIVE_INFINITY)).toBeNull();
	});
});
