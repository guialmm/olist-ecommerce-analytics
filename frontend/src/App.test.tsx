import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { ApiError } from "./lib/api";

// vi.mock's factory is hoisted above these imports, então os dados mockados
// e as funções que os usam precisam nascer dentro de vi.hoisted().
const { filterOptions, mockApi } = vi.hoisted(() => {
  const filterOptions = {
    states: ["SP", "RJ"],
    categories: ["health_beauty"],
    min_date: "2016-09-04",
    max_date: "2018-10-17",
  };
  const kpis = {
    revenue: 13494400.74,
    orders: 98199,
    avg_order_value: 137.42,
    pct_on_time: 91.9,
    latest_month: "2018-08-01",
    revenue_trend_pct: -3.3,
    orders_trend_pct: 3.0,
    avg_order_value_trend_pct: -6.2,
    pct_on_time_trend_pct: -5.9,
  };
  return {
    filterOptions,
    kpis,
    mockApi: {
      filterOptions: vi.fn().mockResolvedValue(filterOptions),
      kpis: vi.fn().mockResolvedValue(kpis),
      revenue: vi.fn().mockResolvedValue([{ month: "2018-08-01", revenue: 100, orders: 1 }]),
      orderStatus: vi.fn().mockResolvedValue([{ status: "delivered", n_orders: 10 }]),
      deliveryVsReview: vi.fn().mockResolvedValue({ on_time: [], late: [] }),
      topCategories: vi.fn().mockResolvedValue([{ category: "health_beauty", revenue: 100 }]),
      revenueByState: vi.fn().mockResolvedValue([{ state: "SP", revenue: 100 }]),
      paymentMethods: vi
        .fn()
        .mockResolvedValue([{ payment_type: "credit_card", n_orders: 5, total_value: 100 }]),
      freightByState: vi
        .fn()
        .mockResolvedValue([{ state: "SP", avg_freight_pct: 20, avg_freight_value: 15 }]),
      topSellers: vi
        .fn()
        .mockResolvedValue([{ seller_id: "abcd1234", seller_state: "SP", revenue: 100, orders: 3 }]),
    },
  };
});

vi.mock("./lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lib/api")>();
  return { ...actual, api: mockApi };
});

describe("App", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the KPIs once every request resolves", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/R\$ 13\.494\.401/)).toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(screen.getByText("98.199")).toBeInTheDocument();
  });

  it("shows a friendly error with a retry button when the API is unreachable, and recovers on retry", async () => {
    const { api } = await import("./lib/api");
    const filterOptionsMock = vi.mocked(api.filterOptions);
    filterOptionsMock.mockRejectedValueOnce(
      new ApiError("network", "Não foi possível conectar à API em http://localhost:8000."),
    );

    render(<App />);

    await waitFor(() =>
      expect(screen.getByText("Não foi possível carregar o dashboard")).toBeInTheDocument(),
    );
    expect(screen.getByText(/Não foi possível conectar à API/)).toBeInTheDocument();

    filterOptionsMock.mockResolvedValueOnce(filterOptions);
    await userEvent.click(screen.getByText("Tentar novamente"));

    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
  });

  it("surfaces the backend's error detail (e.g. database down) instead of a generic message", async () => {
    const { api } = await import("./lib/api");
    vi.mocked(api.filterOptions).mockRejectedValueOnce(
      new ApiError(503, "Banco de dados indisponível. Verifique se o MySQL está rodando."),
    );

    render(<App />);

    await waitFor(() => expect(screen.getByText(/Banco de dados indisponível/)).toBeInTheDocument());
  });
});
