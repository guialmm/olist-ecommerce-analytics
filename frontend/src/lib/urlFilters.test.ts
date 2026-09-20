import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFiltersFromUrl, writeFiltersToUrl } from "./urlFilters";

describe("readFiltersFromUrl", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("returns empty defaults when there is no query string", () => {
    window.history.replaceState(null, "", "/");
    expect(readFiltersFromUrl()).toEqual({
      states: [],
      categories: [],
      startDate: null,
      endDate: null,
    });
  });

  it("reads repeated states/categories params as arrays", () => {
    window.history.replaceState(null, "", "/?states=SP&states=RJ&categories=health_beauty");
    const filters = readFiltersFromUrl();
    expect(filters.states).toEqual(["SP", "RJ"]);
    expect(filters.categories).toEqual(["health_beauty"]);
  });

  it("reads start_date/end_date", () => {
    window.history.replaceState(null, "", "/?start_date=2018-01-01&end_date=2018-03-31");
    const filters = readFiltersFromUrl();
    expect(filters.startDate).toBe("2018-01-01");
    expect(filters.endDate).toBe("2018-03-31");
  });
});

describe("writeFiltersToUrl", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("writes an empty query string when there are no filters", () => {
    writeFiltersToUrl({ states: [], categories: [], startDate: null, endDate: null });
    expect(window.location.search).toBe("");
  });

  it("writes repeated params for states/categories and single params for dates", () => {
    writeFiltersToUrl({
      states: ["SP", "RJ"],
      categories: ["health_beauty"],
      startDate: "2018-01-01",
      endDate: "2018-03-31",
    });
    const params = new URLSearchParams(window.location.search);
    expect(params.getAll("states")).toEqual(["SP", "RJ"]);
    expect(params.getAll("categories")).toEqual(["health_beauty"]);
    expect(params.get("start_date")).toBe("2018-01-01");
    expect(params.get("end_date")).toBe("2018-03-31");
  });

  it("round-trips through readFiltersFromUrl", () => {
    const original = {
      states: ["MG"],
      categories: ["toys", "furniture_decor"],
      startDate: "2017-06-01",
      endDate: null,
    };
    writeFiltersToUrl(original);
    expect(readFiltersFromUrl()).toEqual(original);
  });
});
