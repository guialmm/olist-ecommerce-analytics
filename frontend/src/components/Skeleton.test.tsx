import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartSkeleton, KpiCardSkeleton, Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";

describe("Skeleton", () => {
  it("applies the pulse animation class", () => {
    const { container } = render(<Skeleton className="h-4 w-10" />);
    expect(container.firstChild).toHaveClass("animate-pulse");
  });
});

describe("KpiCardSkeleton", () => {
  it("renders three placeholder bars", () => {
    const { container } = render(<KpiCardSkeleton />);
    expect(container.querySelectorAll(".animate-pulse").length).toBe(3);
  });
});

describe("ChartSkeleton", () => {
  it("uses the requested height", () => {
    const { container } = render(<ChartSkeleton height={321} />);
    expect((container.firstChild as HTMLElement).style.height).toBe("321px");
  });
});

describe("EmptyState", () => {
  it("shows the no-data message", () => {
    render(<EmptyState />);
    expect(screen.getByText("Nenhum dado para esse filtro.")).toBeInTheDocument();
  });
});
