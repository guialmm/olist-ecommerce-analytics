export interface UrlFilterState {
  states: string[];
  categories: string[];
  startDate: string | null;
  endDate: string | null;
}

/** Lê o estado inicial dos filtros a partir da query string (deep link / link compartilhado). */
export function readFiltersFromUrl(): UrlFilterState {
  const params = new URLSearchParams(window.location.search);
  return {
    states: params.getAll("states"),
    categories: params.getAll("categories"),
    startDate: params.get("start_date"),
    endDate: params.get("end_date"),
  };
}

/** Reflete o estado atual dos filtros na URL (replaceState — não polui o histórico). */
export function writeFiltersToUrl(filters: UrlFilterState): void {
  const params = new URLSearchParams();
  filters.states.forEach((s) => params.append("states", s));
  filters.categories.forEach((c) => params.append("categories", c));
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}
