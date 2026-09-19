import { describe, expect, it } from "vitest";
import { formatCurrency, formatMonth, humanize, subMonths } from "./format";

describe("formatCurrency", () => {
  it("formats with R$ prefix and pt-BR thousands separator", () => {
    expect(formatCurrency(1234567)).toBe("R$ 1.234.567");
  });

  it("rounds decimals", () => {
    expect(formatCurrency(99.6)).toBe("R$ 100");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("R$ 0");
  });
});

describe("humanize", () => {
  it("replaces underscores with spaces and title-cases", () => {
    expect(humanize("health_beauty")).toBe("Health Beauty");
  });

  it("handles a single word", () => {
    expect(humanize("electronics")).toBe("Electronics");
  });

  it("leaves already-clean text mostly unchanged (still title-cases)", () => {
    expect(humanize("bed_bath_table")).toBe("Bed Bath Table");
  });
});

describe("formatMonth", () => {
  it("formats an ISO date as pt-BR short month/year", () => {
    // pt-BR abbrevia meses com ponto (ex: "jan."), então checamos as partes.
    const result = formatMonth("2018-03-01");
    expect(result.toLowerCase()).toContain("mar");
    expect(result).toContain("18");
  });
});

describe("subMonths", () => {
  it("subtracts whole months", () => {
    expect(subMonths("2018-08-17", 3)).toBe("2018-05-17");
  });

  it("crosses a year boundary", () => {
    expect(subMonths("2018-01-15", 2)).toBe("2017-11-15");
  });

  it("subtracting zero months returns the same date", () => {
    expect(subMonths("2018-06-01", 0)).toBe("2018-06-01");
  });
});
