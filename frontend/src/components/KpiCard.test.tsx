import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiCard } from "./KpiCard";

describe("KpiCard", () => {
  it("renders the label and the formatted value", async () => {
    render(<KpiCard label="Receita (GMV)" value={1000} format={(v) => `R$ ${Math.round(v)}`} />);
    expect(screen.getByText("Receita (GMV)")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("R$ 1000")).toBeInTheDocument(), { timeout: 2000 });
  });

  it("shows an upward, green delta when deltaPct is positive", () => {
    render(
      <KpiCard
        label="Pedidos"
        value={10}
        format={(v) => `${v}`}
        deltaPct={12.3}
        deltaLabel="vs. mês anterior"
      />,
    );
    const delta = screen.getByText(/12.3/);
    expect(delta.textContent).toContain("↑");
    expect(delta.textContent).toContain("vs. mês anterior");
    expect(delta.className).toContain("text-up");
  });

  it("shows a downward, red delta when deltaPct is negative", () => {
    render(<KpiCard label="Ticket médio" value={10} format={(v) => `${v}`} deltaPct={-5} />);
    const delta = screen.getByText(/5/);
    expect(delta.textContent).toContain("↓");
    expect(delta.className).toContain("text-down");
  });

  it("renders no delta line when deltaPct is null or omitted", () => {
    const { container, rerender } = render(
      <KpiCard label="Sem histórico" value={10} format={(v) => `${v}`} deltaPct={null} />,
    );
    expect(container.querySelectorAll("p").length).toBe(2); // label + valor, sem linha de delta

    rerender(<KpiCard label="Sem histórico" value={10} format={(v) => `${v}`} />);
    expect(container.querySelectorAll("p").length).toBe(2);
  });

  it("uses a custom delta suffix (e.g. percentage points)", () => {
    render(
      <KpiCard label="Entregas no prazo" value={90} format={(v) => `${v}%`} deltaPct={-2} deltaSuffix="pp" />,
    );
    expect(screen.getByText(/2\.0pp/)).toBeInTheDocument();
  });
});
