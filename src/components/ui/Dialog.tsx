import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export interface DialogProps {
	open: boolean;
	title: string;
	description?: string;
	onClose: () => void;
	children: ReactNode;
	className?: string;
}

export function Dialog({
	open,
	title,
	description,
	onClose,
	children,
	className = "",
}: DialogProps) {
	const titleId = useId();
	const descriptionId = useId();
	const panelRef = useRef<HTMLDivElement>(null);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	useEffect(() => {
		if (!open) return;

		const previouslyFocused = document.activeElement as HTMLElement | null;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const focusable = panelRef.current?.querySelector<HTMLElement>(
			'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
		);
		(focusable ?? panelRef.current)?.focus();

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				event.stopPropagation();
				onCloseRef.current();
				return;
			}

			if (event.key !== "Tab" || !panelRef.current) return;
			const items = Array.from(
				panelRef.current.querySelectorAll<HTMLElement>(
					'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
				),
			);
			if (items.length === 0) {
				event.preventDefault();
				panelRef.current.focus();
				return;
			}
			const first = items[0];
			const last = items[items.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}

		function onFocusIn(event: FocusEvent) {
			if (
				panelRef.current &&
				event.target instanceof Node &&
				!panelRef.current.contains(event.target)
			) {
				panelRef.current
					.querySelector<HTMLElement>(
						'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
					)
					?.focus();
			}
		}

		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("focusin", onFocusIn);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("focusin", onFocusIn);
			document.body.style.overflow = previousOverflow;
			previouslyFocused?.focus();
		};
	}, [open]);

	if (!open) return null;

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/45 p-4">
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={description ? descriptionId : undefined}
				tabIndex={-1}
				className={`max-h-[min(90vh,820px)] w-full max-w-[560px] overflow-y-auto rounded-lg border border-line bg-surface shadow-xl outline-none ${className}`}
			>
				<header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
					<div>
						<h2 id={titleId} className="text-base font-bold text-ink-strong">
							{title}
						</h2>
						{description ? (
							<p id={descriptionId} className="mt-1 text-sm text-ink-muted">
								{description}
							</p>
						) : null}
					</div>
					<button
						type="button"
						aria-label="Fechar"
						onClick={onClose}
						className="rounded-sm px-2 py-1 text-lg leading-none text-ink-muted hover:bg-canvas focus-visible:outline-2 focus-visible:outline-accent-500"
					>
						×
					</button>
				</header>
				<div className="p-5">{children}</div>
			</div>
		</div>,
		document.body,
	);
}
