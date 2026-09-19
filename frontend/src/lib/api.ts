const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface FilterOptions {
  states: string[];
  categories: string[];
  min_date: string;
  max_date: string;
}

export interface Kpis {
  revenue: number;
  orders: number;
  avg_order_value: number;
  pct_on_time: number;
  latest_month?: string;
  revenue_trend_pct?: number | null;
  orders_trend_pct?: number | null;
  avg_order_value_trend_pct?: number | null;
  pct_on_time_trend_pct?: number | null;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  orders: number;
}

export interface OrderStatusPoint {
  status: string;
  n_orders: number;
}

export interface ScoreBucket {
  score: number;
  count: number;
  pct: number;
}

export interface DeliveryVsReview {
  on_time: ScoreBucket[];
  late: ScoreBucket[];
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
}

export interface StateRevenue {
  state: string;
  revenue: number;
}

export interface PaymentMethod {
  payment_type: string;
  n_orders: number;
  total_value: number;
}

export interface FreightByState {
  state: string;
  avg_freight_pct: number;
  avg_freight_value: number;
}

export interface TopSeller {
  seller_id: string;
  seller_state: string;
  revenue: number;
  orders: number;
}

export interface Filters {
  states: string[];
  categories: string[];
  startDate?: string | null;
  endDate?: string | null;
}

export function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  filters.states.forEach((s) => params.append("states", s));
  filters.categories.forEach((c) => params.append("categories", c));
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Erro de API — carrega a mensagem que o backend devolveu (campo `detail`) quando existe. */
export class ApiError extends Error {
  status: number | "network";

  constructor(status: number | "network", message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getJSON<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new ApiError("network", `Não foi possível conectar à API em ${API_BASE}.`);
  }
  if (!res.ok) {
    let detail = `Erro ${res.status} ao buscar ${path}.`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // corpo de erro não era JSON — mantém a mensagem genérica
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  filterOptions: () => getJSON<FilterOptions>("/api/filters"),
  kpis: (f: Filters) => getJSON<Kpis>(`/api/kpis${buildQuery(f)}`),
  revenue: (f: Filters) => getJSON<RevenuePoint[]>(`/api/revenue${buildQuery(f)}`),
  orderStatus: (f: Filters) => getJSON<OrderStatusPoint[]>(`/api/order-status${buildQuery(f)}`),
  deliveryVsReview: (f: Filters) =>
    getJSON<DeliveryVsReview>(`/api/delivery-vs-review${buildQuery(f)}`),
  topCategories: (f: Filters) => getJSON<CategoryRevenue[]>(`/api/top-categories${buildQuery(f)}`),
  revenueByState: (f: Filters) => getJSON<StateRevenue[]>(`/api/revenue-by-state${buildQuery(f)}`),
  paymentMethods: (f: Filters) => getJSON<PaymentMethod[]>(`/api/payment-methods${buildQuery(f)}`),
  freightByState: (f: Filters) =>
    getJSON<FreightByState[]>(`/api/freight-by-state${buildQuery(f)}`),
  topSellers: (f: Filters) => getJSON<TopSeller[]>(`/api/top-sellers${buildQuery(f)}`),
};
