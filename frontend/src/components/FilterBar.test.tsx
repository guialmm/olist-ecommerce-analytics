import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "./FilterBar";

const options = {
  states: ["SP", "RJ"],
  categories: ["health_beauty", "bed_bath_table"],
  min_date: "2016-09-04",
  max_date: "2018-10-17",
};

function renderFilterBar(overrides: Partial<Parameters<typeof FilterBar>[0]> = {}) {
  const props = {
    options,
    selectedStates: [],
    selectedCategories: [],
    onToggleState: vi.fn(),
    onToggleCategory: vi.fn(),
    onClearStates: vi.fn(),
    onClearCategories: vi.fn(),
    ...overrides,
  };
  render(<FilterBar {...props} />);
  return props;
}

describe("FilterBar", () => {
  it("renders one selector for states and one for categories, each showing 'todos (N)'", () => {
    renderFilterBar();
    expect(screen.getByText("Estado")).toBeInTheDocument();
    expect(screen.getByText("Categoria")).toBeInTheDocument();
    expect(screen.getAllByText(/todos \(2\)/)).toHaveLength(2);
  });

  it("opens the state dropdown and forwards the raw value to onToggleState", async () => {
    const props = renderFilterBar();
    await userEvent.click(screen.getByText("Estado"));
    await userEvent.click(screen.getByText("SP"));
    expect(props.onToggleState).toHaveBeenCalledWith("SP");
  });

  it("opens the category dropdown showing humanized labels but forwards the raw value", async () => {
    const props = renderFilterBar();
    await userEvent.click(screen.getByText("Categoria"));
    expect(screen.getByText("Health Beauty")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Health Beauty"));
    expect(props.onToggleCategory).toHaveBeenCalledWith("health_beauty");
  });

  it("shows a count instead of 'todos' once something is selected", () => {
    renderFilterBar({ selectedStates: ["SP"] });
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });
});
