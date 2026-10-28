import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

function DialogHarness() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Abrir diálogo
			</button>
			<Dialog open={open} title="Confirmar ação" onClose={() => setOpen(false)}>
				<button type="button">Confirmar</button>
				<button type="button">Cancelar</button>
			</Dialog>
		</>
	);
}

describe("Dialog", () => {
	it("@spec:AC-032 fecha com Escape e devolve o foco ao controle de abertura", () => {
		render(<DialogHarness />);
		const opener = screen.getByRole("button", { name: "Abrir diálogo" });
		opener.focus();
		fireEvent.click(opener);

		expect(screen.getByRole("button", { name: "Fechar" })).toHaveFocus();
		fireEvent.keyDown(document, { key: "Escape" });

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(opener).toHaveFocus();
	});

	it("@spec:AC-032 mantém o foco dentro do diálogo e permite fechar pelo botão", () => {
		render(<DialogHarness />);
		fireEvent.click(screen.getByRole("button", { name: "Abrir diálogo" }));

		const close = screen.getByRole("button", { name: "Fechar" });
		const cancel = screen.getByRole("button", { name: "Cancelar" });
		cancel.focus();
		fireEvent.keyDown(document, { key: "Tab" });
		expect(close).toHaveFocus();

		fireEvent.click(close);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("não renderiza quando fechado", () => {
		const onClose = vi.fn();
		render(
			<Dialog open={false} title="Fechado" onClose={onClose}>
				<p>Conteúdo</p>
			</Dialog>,
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});
