import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, buildQuery } from "./api";

describe("buildQuery", () => {
  it("returns an empty string when nothing is set", () => {
    expect(buildQuery({ states: [], categories: [] })).toBe("");
  });

  it("appends one param per selected state", () => {
    const qs = buildQuery({ states: ["SP", "RJ"], categories: [] });
    expect(qs).toBe("?states=SP&states=RJ");
  });

  it("combines states, categories and date range", () => {
    const qs = buildQuery({
      states: ["SP"],
      categories: ["health_beauty"],
      startDate: "2018-01-01",
      endDate: "2018-03-31",
    });
    const params = new URLSearchParams(qs.slice(1));
    expect(params.getAll("states")).toEqual(["SP"]);
    expect(params.getAll("categories")).toEqual(["health_beauty"]);
    expect(params.get("start_date")).toBe("2018-01-01");
    expect(params.get("end_date")).toBe("2018-03-31");
  });

  it("omits date params when null", () => {
    const qs = buildQuery({ states: [], categories: [], startDate: null, endDate: null });
    expect(qs).toBe("");
  });
});

describe("api error handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws an ApiError with the backend's detail message on a 4xx/5xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ detail: "Banco de dados indisponível." }),
      }),
    );

    await expect(api.kpis({ states: [], categories: [] })).rejects.toMatchObject({
      name: "ApiError",
      status: 503,
      message: "Banco de dados indisponível.",
    });
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("not json");
        },
      }),
    );

    await expect(api.kpis({ states: [], categories: [] })).rejects.toThrow(/Erro 500/);
  });

  it("wraps a network failure as an ApiError with status 'network'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    let caught: unknown;
    try {
      await api.kpis({ states: [], categories: [] });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe("network");
  });

  it("resolves with parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ revenue: 100, orders: 1, avg_order_value: 100, pct_on_time: 90 }),
      }),
    );

    const result = await api.kpis({ states: [], categories: [] });
    expect(result.revenue).toBe(100);
  });
});
