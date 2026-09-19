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

describe("FilterBar", () => {
  it("renders a humanized label for each category", () => {
    render(
      <FilterBar
        options={options}
        selectedStates={[]}
        selectedCategories={[]}
        onToggleState={() => {}}
        onToggleCategory={() => {}}
      />,
    );
    expect(screen.getByText("Health Beauty")).toBeInTheDocument();
    expect(screen.getByText("Bed Bath Table")).toBeInTheDocument();
  });

  it("calls onToggleState with the clicked state", async () => {
    const onToggleState = vi.fn();
    render(
      <FilterBar
        options={options}
        selectedStates={[]}
        selectedCategories={[]}
        onToggleState={onToggleState}
        onToggleCategory={() => {}}
      />,
    );
    await userEvent.click(screen.getByText("SP"));
    expect(onToggleState).toHaveBeenCalledWith("SP");
  });

  it("calls onToggleCategory with the raw category value, not the humanized label", async () => {
    const onToggleCategory = vi.fn();
    render(
      <FilterBar
        options={options}
        selectedStates={[]}
        selectedCategories={[]}
        onToggleState={() => {}}
        onToggleCategory={onToggleCategory}
      />,
    );
    await userEvent.click(screen.getByText("Health Beauty"));
    expect(onToggleCategory).toHaveBeenCalledWith("health_beauty");
  });

  it("shows 'todos (N)' when nothing is selected, and a count when something is", () => {
    const { rerender } = render(
      <FilterBar
        options={options}
        selectedStates={[]}
        selectedCategories={[]}
        onToggleState={() => {}}
        onToggleCategory={() => {}}
      />,
    );
    expect(screen.getAllByText(/todos \(2\)/)).toHaveLength(2);

    rerender(
      <FilterBar
        options={options}
        selectedStates={["SP"]}
        selectedCategories={[]}
        onToggleState={() => {}}
        onToggleCategory={() => {}}
      />,
    );
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });
});
