import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";
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
    mockApi: {
      me: vi.fn().mockResolvedValue({ username: "demo" }),
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
      geoDensity: vi
        .fn()
        .mockResolvedValue([
          { lat: -23.55, lng: -46.63, city: "sao paulo", state: "SP", revenue: 100, orders: 3 },
        ]),
      reviewRiskModel: vi.fn().mockResolvedValue({
        metrics: {
          accuracy: 0.89,
          roc_auc: 0.7,
          base_rate: 0.13,
          n_train: 100,
          n_test: 20,
          confusion_matrix: { true_negative: 15, false_positive: 1, false_negative: 3, true_positive: 1 },
        },
        curve: [
          { delivery_days: 0, on_time_risk: 0.06, late_risk: 0.25 },
          { delivery_days: 10, on_time_risk: 0.09, late_risk: 0.32 },
        ],
        trained_at: "2026-01-01T00:00:00Z",
      }),
    },
  };
});

vi.mock("./lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lib/api")>();
  return { ...actual, api: mockApi };
});

// react-leaflet/leaflet.heat fazem bastante coisa que o jsdom não suporta
// bem (canvas, ResizeObserver, tiles reais) — como os outros gráficos
// (Recharts) também não têm teste próprio, aqui só garantimos que o
// Dashboard passa os dados certos, sem montar o mapa de verdade.
vi.mock("./components/GeoHeatmap", () => ({
  GeoHeatmap: ({ data }: { data: unknown[] }) => (
    <div data-testid="geo-heatmap-stub">{data.length} pontos</div>
  ),
}));

describe("Dashboard", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the KPIs once every request resolves", async () => {
    render(<Dashboard onLogout={() => {}} onSessionExpired={() => {}} />);
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/R\$ 13\.494\.401/)).toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(screen.getByText("98.199")).toBeInTheDocument();
    expect(screen.getByText("Mapa de calor de pedidos")).toBeInTheDocument();
    expect(screen.getByTestId("geo-heatmap-stub")).toHaveTextContent("1 pontos");
  });

  it("shows a friendly error with a retry button when the API is unreachable, and recovers on retry", async () => {
    const { api } = await import("./lib/api");
    const filterOptionsMock = vi.mocked(api.filterOptions);
    filterOptionsMock.mockRejectedValueOnce(
      new ApiError("network", "Não foi possível conectar à API em http://localhost:8000."),
    );

    render(<Dashboard onLogout={() => {}} onSessionExpired={() => {}} />);

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

    render(<Dashboard onLogout={() => {}} onSessionExpired={() => {}} />);

    await waitFor(() => expect(screen.getByText(/Banco de dados indisponível/)).toBeInTheDocument());
  });

  it("calls onSessionExpired (instead of showing the generic error screen) when a request returns 401", async () => {
    const { api } = await import("./lib/api");
    vi.mocked(api.filterOptions).mockRejectedValueOnce(new ApiError(401, "Sessão expirada."));
    const onSessionExpired = vi.fn();

    render(<Dashboard onLogout={() => {}} onSessionExpired={onSessionExpired} />);

    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Não foi possível carregar o dashboard")).not.toBeInTheDocument();
  });

  it("calls onLogout when the Sair button is clicked", async () => {
    const onLogout = vi.fn();
    render(<Dashboard onLogout={onLogout} onSessionExpired={() => {}} />);
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Sair"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("only shows 'limpar filtros' once a filter is active, and it resets everything", async () => {
    render(<Dashboard onLogout={() => {}} onSessionExpired={() => {}} />);
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());

    expect(screen.queryByText("limpar filtros")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Estado"));
    await userEvent.click(screen.getByText("SP"));

    expect(await screen.findByText("limpar filtros")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();

    await userEvent.click(screen.getByText("limpar filtros"));

    expect(screen.queryByText("limpar filtros")).not.toBeInTheDocument();
    expect(screen.getByText(/todos \(2\)/)).toBeInTheDocument();
  });

  it("ignores a stale response that resolves after a newer filter request", async () => {
    const { api } = await import("./lib/api");
    let resolveInitial!: (v: unknown) => void;
    let resolveFiltered!: (v: unknown) => void;
    const initialCall = new Promise((res) => {
      resolveInitial = res;
    });
    const filteredCall = new Promise((res) => {
      resolveFiltered = res;
    });
    vi.mocked(api.kpis).mockReturnValueOnce(initialCall as never);
    vi.mocked(api.kpis).mockReturnValueOnce(filteredCall as never);

    render(<Dashboard onLogout={() => {}} onSessionExpired={() => {}} />);
    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());

    // troca de filtro dispara a segunda chamada a api.kpis antes da primeira
    // (o carregamento inicial, sem filtro) ter respondido.
    await userEvent.click(screen.getByText("Estado"));
    await userEvent.click(screen.getByText("SP"));

    // a chamada mais recente (filtrada) responde primeiro...
    resolveFiltered({ revenue: 999, orders: 1, avg_order_value: 999, pct_on_time: 50 });
    await waitFor(() => expect(screen.getByText(/R\$ 999/)).toBeInTheDocument(), { timeout: 3000 });

    // ...e a mais antiga (sem filtro) chega atrasada. Não pode sobrescrever a tela.
    resolveInitial({ revenue: 111, orders: 2, avg_order_value: 111, pct_on_time: 10 });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/R\$ 111/)).not.toBeInTheDocument();
    expect(screen.getByText(/R\$ 999/)).toBeInTheDocument();
  });
});
