import { useEffect, useSyncExternalStore } from "react";

export type ColorScheme = "light" | "dark";
export type StoredColorScheme = ColorScheme | null;

export const COLOR_SCHEME_STORAGE_KEY = "color-scheme";

const listeners = new Set<() => void>();
let memoryOverride: StoredColorScheme | undefined;

function emitChange() {
	for (const listener of listeners) {
		listener();
	}
}

export function getSystemScheme(): ColorScheme {
	if (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches
	) {
		return "dark";
	}
	return "light";
}

export function getStoredScheme(): StoredColorScheme {
	if (typeof window === "undefined") {
		return memoryOverride ?? null;
	}
	try {
		const raw = window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
		if (raw === "light" || raw === "dark") {
			return raw;
		}
		return null;
	} catch {
		return memoryOverride ?? null;
	}
}

export function applySchemeToDocument(stored: StoredColorScheme): void {
	if (typeof document === "undefined" || !document.head) return;

	let meta = document.head.querySelector<HTMLMetaElement>(
		'meta[name="color-scheme"]',
	);
	if (!meta) {
		meta = document.createElement("meta");
		meta.name = "color-scheme";
		document.head.appendChild(meta);
	}
	meta.content = stored ?? "light dark";
}

export function getResolvedScheme(): ColorScheme {
	return getStoredScheme() ?? getSystemScheme();
}

export function toggleColorScheme(): ColorScheme {
	const current = getResolvedScheme();
	const target: ColorScheme = current === "dark" ? "light" : "dark";
	const system = getSystemScheme();

	if (target === system) {
		try {
			window.localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
		} catch {
			// Fallback em memória quando o storage está bloqueado.
		}
		memoryOverride = null;
		applySchemeToDocument(null);
	} else {
		try {
			window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, target);
		} catch {
			// Fallback em memória quando o storage está bloqueado.
		}
		memoryOverride = target;
		applySchemeToDocument(target);
	}

	emitChange();
	return target;
}

export function resetColorSchemeState(): void {
	memoryOverride = undefined;
	if (typeof window !== "undefined") {
		try {
			window.localStorage.removeItem(COLOR_SCHEME_STORAGE_KEY);
		} catch {
			// Ignora erro caso localStorage esteja indisponível.
		}
	}
	applySchemeToDocument(null);
	emitChange();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);

	if (typeof window === "undefined") {
		return () => {
			listeners.delete(listener);
		};
	}

	function onStorage(event: StorageEvent) {
		if (event.key === COLOR_SCHEME_STORAGE_KEY || event.key === null) {
			memoryOverride = undefined;
			applySchemeToDocument(getStoredScheme());
			emitChange();
		}
	}

	window.addEventListener("storage", onStorage);

	const mediaQuery =
		typeof window.matchMedia === "function"
			? window.matchMedia("(prefers-color-scheme: dark)")
			: null;

	function onMediaChange() {
		// Nunca apaga um valor explícito salvo quando o sistema passa a coincidir com ele.
		emitChange();
	}

	mediaQuery?.addEventListener("change", onMediaChange);

	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", onStorage);
		mediaQuery?.removeEventListener("change", onMediaChange);
	};
}

export function useColorScheme(): {
	scheme: ColorScheme;
	toggle: () => void;
} {
	const scheme = useSyncExternalStore(
		subscribe,
		getResolvedScheme,
		(): ColorScheme => "light",
	);

	useEffect(() => {
		applySchemeToDocument(getStoredScheme());
	}, []);

	return {
		scheme,
		toggle: toggleColorScheme,
	};
}
