import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SectionCard } from "./SectionCard";

describe("SectionCard", () => {
  it("renders the title, subtitle, and children", () => {
    render(
      <SectionCard title="Receita mensal" subtitle="valor dos itens vendidos">
        <p>conteúdo do gráfico</p>
      </SectionCard>,
    );
    expect(screen.getByText("Receita mensal")).toBeInTheDocument();
    expect(screen.getByText("valor dos itens vendidos")).toBeInTheDocument();
    expect(screen.getByText("conteúdo do gráfico")).toBeInTheDocument();
  });

  it("does not render a CSV button when onExportCsv is not provided", () => {
    render(<SectionCard title="Título">conteúdo</SectionCard>);
    expect(screen.queryByText("csv")).not.toBeInTheDocument();
  });

  it("renders a CSV button that calls onExportCsv when clicked", async () => {
    const onExportCsv = vi.fn();
    render(
      <SectionCard title="Título" onExportCsv={onExportCsv}>
        conteúdo
      </SectionCard>,
    );
    await userEvent.click(screen.getByText("csv"));
    expect(onExportCsv).toHaveBeenCalledTimes(1);
  });
});
