import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import type { PeriodSelection } from "./api";
import { PeriodFilter } from "./PeriodFilter";

function Harness({
	onChange,
}: {
	onChange?: (value: PeriodSelection) => void;
}) {
	const [value, setValue] = useState<PeriodSelection>({ period: "this_month" });

	return (
		<PeriodFilter
			value={value}
			onChange={(next) => {
				setValue(next);
				onChange?.(next);
			}}
		/>
	);
}

describe("filtro de período do dashboard", () => {
	it("@spec:AC-033 abre o popover, aplica período ou intervalo e fecha com Escape", () => {
		const changes: PeriodSelection[] = [];
		render(<Harness onChange={(value) => changes.push(value)} />);
		const trigger = screen.getByRole("button", {
			name: /Período: Este mês/,
		});

		fireEvent.click(trigger);
		expect(
			screen.getByRole("dialog", { name: "Período do painel" }),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Último trimestre" }));
		fireEvent.click(screen.getByRole("button", { name: "Aplicar período" }));
		expect(
			screen.getByRole("button", { name: /Período: Último trimestre/ }),
		).toBeInTheDocument();
		expect(changes).toEqual([
			expect.objectContaining({ period: "last_quarter" }),
		]);

		fireEvent.click(screen.getByRole("button", { name: /Período:/ }));
		fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));
		fireEvent.change(screen.getByLabelText("Data inicial"), {
			target: { value: "2026-09-01" },
		});
		fireEvent.change(screen.getByLabelText("Data final"), {
			target: { value: "2026-09-30" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Aplicar período" }));
		const customTrigger = screen.getByRole("button", {
			name: /Período: 01\/09\/2026 – 30\/09\/2026/,
		});
		expect(changes).toEqual([
			expect.objectContaining({ period: "last_quarter" }),
			expect.objectContaining({
				period: "custom",
				startDate: "2026-09-01",
				endDate: "2026-09-30",
			}),
		]);

		fireEvent.click(customTrigger);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(
			screen.queryByRole("dialog", { name: "Período do painel" }),
		).not.toBeInTheDocument();
		expect(customTrigger).toHaveFocus();
	});

	it("bloqueia intervalo invertido sem devolver a escolha ao dashboard", () => {
		const changes: PeriodSelection[] = [];
		render(<Harness onChange={(value) => changes.push(value)} />);

		fireEvent.click(screen.getByRole("button", { name: /Período:/ }));
		fireEvent.change(screen.getByLabelText("Data inicial"), {
			target: { value: "2026-10-10" },
		});
		fireEvent.change(screen.getByLabelText("Data final"), {
			target: { value: "2026-10-01" },
		});
		expect(screen.getByRole("alert")).toHaveTextContent(
			"A data inicial deve ser anterior à data final.",
		);
		expect(
			screen.getByRole("button", { name: "Aplicar período" }),
		).toBeDisabled();
		expect(changes).toHaveLength(0);
	});
});
