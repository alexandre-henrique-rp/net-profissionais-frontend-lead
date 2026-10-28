import type { InputHTMLAttributes, ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement, useId } from "react";

export interface FieldProps {
	label: string;
	hint?: ReactNode;
	/** Controle associado. Recebe o `id` do rótulo automaticamente. */
	children: ReactElement<InputHTMLAttributes<HTMLInputElement>>;
}

/**
 * Rótulo + controle + dica — o agrupamento usado nos formulários do design.
 *
 * A associação `label` → `input` é explícita (mesmo `id`), o que mantém o
 * clique no rótulo focando o campo e o leitor de tela anunciando o nome.
 */
export function Field({ label, hint, children }: FieldProps) {
	const id = useId();

	const control = isValidElement(children)
		? cloneElement(children, { id })
		: children;

	return (
		<label htmlFor={id} className="block">
			<span className="mb-1.5 block text-[12px] font-bold text-ink-strong">
				{label}
			</span>
			{control}
			{hint ? (
				<span className="mt-1 block text-[11px] text-ink-muted">{hint}</span>
			) : null}
		</label>
	);
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
	invalid?: boolean;
}

/** Campo do design: fundo cinza-claro, borda da linha e raio de 8px. */
export function TextInput({
	invalid = false,
	className = "",
	...props
}: TextInputProps) {
	return (
		<input
			className={`h-11 w-full rounded-md border bg-canvas px-4 text-[13px] font-semibold text-ink-strong outline-none transition-colors placeholder:font-normal placeholder:text-ink-muted focus:border-accent-500 ${invalid ? "border-brand-500" : "border-line-strong"} ${className}`}
			{...props}
		/>
	);
}
