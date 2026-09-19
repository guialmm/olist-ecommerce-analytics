const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface FilterOptions {
  states: string[];
  categories: string[];
}

export interface Kpis {
  revenue: number;
  orders: number;
  avg_order_value: number;
  pct_on_time: number;
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

export interface Filters {
  states: string[];
  categories: string[];
}

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  filters.states.forEach((s) => params.append("states", s));
  filters.categories.forEach((c) => params.append("categories", c));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Erro ao buscar ${path}: ${res.status}`);
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
};
