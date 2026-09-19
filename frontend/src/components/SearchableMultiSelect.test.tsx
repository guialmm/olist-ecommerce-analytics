import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchableMultiSelect } from "./SearchableMultiSelect";

const options = ["SP", "RJ", "MG", "BA"];

function renderSelect(overrides: Partial<Parameters<typeof SearchableMultiSelect>[0]> = {}) {
  const props = {
    label: "Estado",
    options,
    selected: [] as string[],
    onToggle: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
  render(<SearchableMultiSelect {...props} />);
  return props;
}

describe("SearchableMultiSelect", () => {
  it("starts closed — only the trigger button is visible", () => {
    renderSelect();
    expect(screen.queryByPlaceholderText(/Buscar/)).not.toBeInTheDocument();
  });

  it("opens the panel on click and lists every option", async () => {
    renderSelect();
    await userEvent.click(screen.getByText("Estado"));
    for (const state of options) {
      expect(screen.getByText(state)).toBeInTheDocument();
    }
  });

  it("filters the option list as you type in the search box", async () => {
    renderSelect();
    await userEvent.click(screen.getByText("Estado"));
    await userEvent.type(screen.getByPlaceholderText(/Buscar/), "sp");
    expect(screen.getByText("SP")).toBeInTheDocument();
    expect(screen.queryByText("RJ")).not.toBeInTheDocument();
  });

  it("shows a message when the search matches nothing", async () => {
    renderSelect();
    await userEvent.click(screen.getByText("Estado"));
    await userEvent.type(screen.getByPlaceholderText(/Buscar/), "zzz");
    expect(screen.getByText("Nada encontrado.")).toBeInTheDocument();
  });

  it("calls onToggle with the raw value when an option is clicked", async () => {
    const props = renderSelect();
    await userEvent.click(screen.getByText("Estado"));
    await userEvent.click(screen.getByText("MG"));
    expect(props.onToggle).toHaveBeenCalledWith("MG");
  });

  it("closes when Escape is pressed", async () => {
    renderSelect();
    await userEvent.click(screen.getByText("Estado"));
    expect(screen.getByPlaceholderText(/Buscar/)).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByPlaceholderText(/Buscar/)).not.toBeInTheDocument());
  });

  it("closes when clicking outside the component", async () => {
    render(
      <div>
        <div data-testid="outside">fora</div>
        <SearchableMultiSelect label="Estado" options={options} selected={[]} onToggle={vi.fn()} onClear={vi.fn()} />
      </div>,
    );
    await userEvent.click(screen.getByText("Estado"));
    expect(screen.getByPlaceholderText(/Buscar/)).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("outside"));
    await waitFor(() => expect(screen.queryByPlaceholderText(/Buscar/)).not.toBeInTheDocument());
  });

  it("only shows the clear button when something is selected, and it calls onClear", async () => {
    const props = renderSelect({ selected: ["SP"] });
    await userEvent.click(screen.getByText("Estado"));
    const clearButton = screen.getByText(/Limpar seleção/);
    expect(clearButton).toBeInTheDocument();
    await userEvent.click(clearButton);
    expect(props.onClear).toHaveBeenCalledTimes(1);
  });

  it("applies a custom formatter to option labels while keeping the raw value for onToggle", async () => {
    const props = renderSelect({
      options: ["health_beauty"],
      formatOption: (v) => v.replace("_", " ").toUpperCase(),
    });
    await userEvent.click(screen.getByText("Estado"));
    await userEvent.click(screen.getByText("HEALTH BEAUTY"));
    expect(props.onToggle).toHaveBeenCalledWith("health_beauty");
  });
});
