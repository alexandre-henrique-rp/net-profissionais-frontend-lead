import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	COLOR_SCHEME_STORAGE_KEY,
	getResolvedScheme,
	getStoredScheme,
	resetColorSchemeState,
	toggleColorScheme,
	useColorScheme,
} from "./theme";

const originalMatchMedia = window.matchMedia;

function mockMatchMedia(initialDark: boolean) {
	let matches = initialDark;
	const changeListeners = new Set<() => void>();

	const mediaQueryList = {
		get matches() {
			return matches;
		},
		media: "(prefers-color-scheme: dark)",
		onchange: null,
		addEventListener: (_event: string, listener: () => void) => {
			changeListeners.add(listener);
		},
		removeEventListener: (_event: string, listener: () => void) => {
			changeListeners.delete(listener);
		},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => true,
	};

	Object.defineProperty(window, "matchMedia", {
		value: () => mediaQueryList as unknown as MediaQueryList,
		configurable: true,
		writable: true,
	});

	return {
		setMatches(nextDark: boolean) {
			matches = nextDark;
			for (const listener of changeListeners) {
				listener();
			}
		},
	};
}

function getMetaContent(): string | null {
	return (
		document.head
			.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')
			?.getAttribute("content") ?? null
	);
}

describe("tema Light/Dark (color-scheme)", () => {
	afterEach(() => {
		Object.defineProperty(window, "matchMedia", {
			value: originalMatchMedia,
			configurable: true,
			writable: true,
		});
		resetColorSchemeState();
	});

	it("mantém o padrão do sistema (light dark) quando não há preferência salva", () => {
		mockMatchMedia(false);
		const { result } = renderHook(() => useColorScheme());

		expect(result.current.scheme).toBe("light");
		expect(getStoredScheme()).toBeNull();
		expect(getMetaContent()).toBe("light dark");
	});

	it("alterna para dark, persiste no localStorage e volta a seguir o sistema ao reverter", () => {
		mockMatchMedia(false);

		const first = toggleColorScheme();
		expect(first).toBe("dark");
		expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe("dark");
		expect(getMetaContent()).toBe("dark");
		expect(getResolvedScheme()).toBe("dark");

		const second = toggleColorScheme();
		expect(second).toBe("light");
		expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBeNull();
		expect(getMetaContent()).toBe("light dark");
		expect(getResolvedScheme()).toBe("light");
	});

	it("preserva o valor salvo no localStorage quando a preferência do sistema passa a coincidir com ele", () => {
		const media = mockMatchMedia(false);
		const { result } = renderHook(() => useColorScheme());

		act(() => {
			result.current.toggle();
		});
		expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe("dark");
		expect(result.current.scheme).toBe("dark");

		// Sistema muda para dark e depois volta para light: o override manual permanece salvo.
		act(() => {
			media.setMatches(true);
		});
		expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe("dark");
		expect(result.current.scheme).toBe("dark");

		act(() => {
			media.setMatches(false);
		});
		expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe("dark");
		expect(result.current.scheme).toBe("dark");
		expect(getMetaContent()).toBe("dark");
	});

	it("sincroniza alteração vinda de outra aba via evento storage", () => {
		mockMatchMedia(false);
		const { result } = renderHook(() => useColorScheme());

		act(() => {
			window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, "dark");
			window.dispatchEvent(
				new StorageEvent("storage", {
					key: COLOR_SCHEME_STORAGE_KEY,
					newValue: "dark",
				}),
			);
		});

		expect(result.current.scheme).toBe("dark");
		expect(getMetaContent()).toBe("dark");
	});

	it("funciona em memória mesmo quando localStorage lança exceção", () => {
		mockMatchMedia(false);
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("storage bloqueado");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("storage bloqueado");
		});
		vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
			throw new Error("storage bloqueado");
		});

		const next = toggleColorScheme();
		expect(next).toBe("dark");
		expect(getMetaContent()).toBe("dark");
		expect(getResolvedScheme()).toBe("dark");

		const reverted = toggleColorScheme();
		expect(reverted).toBe("light");
		expect(getMetaContent()).toBe("light dark");
	});
});
