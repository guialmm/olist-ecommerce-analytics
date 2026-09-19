const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface FilterOptions {
  segments: string[];
  plans: string[];
}

export interface Kpis {
  mrr: number;
  active_subscriptions: number;
  total_users: number;
  conversion_rate: number;
}

export interface MrrPoint {
  active_month: string;
  mrr: number;
  active_subscriptions: number;
}

export interface ChurnPoint {
  month: string;
  cancellations: number;
}

export interface CohortCell {
  cohort_month: string;
  months_since_signup: number;
  active_users: number;
  cohort_size: number;
  retention_pct: number;
}

export interface UsageGroupStats {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  count: number;
}

export interface UsageVsChurn {
  retained: UsageGroupStats | null;
  canceled: UsageGroupStats | null;
}

export interface RevenuePoint {
  segment: string;
  plan_name: string;
  mrr: number;
}

export interface Filters {
  segments: string[];
  plans: string[];
}

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  filters.segments.forEach((s) => params.append("segments", s));
  filters.plans.forEach((p) => params.append("plans", p));
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
  mrr: (f: Filters) => getJSON<MrrPoint[]>(`/api/mrr${buildQuery(f)}`),
  churn: (f: Filters) => getJSON<ChurnPoint[]>(`/api/churn${buildQuery(f)}`),
  cohort: (f: Filters) => getJSON<CohortCell[]>(`/api/cohort${buildQuery(f)}`),
  usageVsChurn: (f: Filters) => getJSON<UsageVsChurn>(`/api/usage-vs-churn${buildQuery(f)}`),
  revenue: (f: Filters) => getJSON<RevenuePoint[]>(`/api/revenue${buildQuery(f)}`),
};
