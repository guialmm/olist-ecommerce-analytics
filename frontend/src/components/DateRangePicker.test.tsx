import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateRangePicker } from "./DateRangePicker";

describe("DateRangePicker", () => {
  const minDate = "2016-09-04";
  const maxDate = "2018-10-17";

  it("marks 'Todo período' active and shows no range when start/end are null", () => {
    render(
      <DateRangePicker minDate={minDate} maxDate={maxDate} startDate={null} endDate={null} onChange={() => {}} />,
    );
    expect(screen.getByText("Todo período").className).toContain("bg-accent-soft");
    expect(screen.getByText("todo o período")).toBeInTheDocument();
  });

  it("calls onChange with maxDate and maxDate-6-months when 'Últimos 6 meses' is clicked", async () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker minDate={minDate} maxDate={maxDate} startDate={null} endDate={null} onChange={onChange} />,
    );
    await userEvent.click(screen.getByText("Últimos 6 meses"));
    expect(onChange).toHaveBeenCalledWith("2018-04-17", "2018-10-17");
  });

  it("calls onChange with maxDate and maxDate-3-months when 'Últimos 3 meses' is clicked", async () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker minDate={minDate} maxDate={maxDate} startDate={null} endDate={null} onChange={onChange} />,
    );
    await userEvent.click(screen.getByText("Últimos 3 meses"));
    expect(onChange).toHaveBeenCalledWith("2018-07-17", "2018-10-17");
  });

  it("clears the range back to null/null when 'Todo período' is clicked from a filtered state", async () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        minDate={minDate}
        maxDate={maxDate}
        startDate="2018-04-17"
        endDate="2018-10-17"
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByText("Todo período"));
    expect(onChange).toHaveBeenCalledWith(null, null);
  });
});
