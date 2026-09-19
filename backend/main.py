from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

import analytics

app = FastAPI(title="SaaS Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _filters(segments: list[str] | None, plans: list[str] | None):
    return segments or [], plans or []


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/filters")
def filters():
    return analytics.get_filter_options()


@app.get("/api/kpis")
def kpis(segments: list[str] | None = Query(None), plans: list[str] | None = Query(None)):
    s, p = _filters(segments, plans)
    return analytics.get_kpis(s, p)


@app.get("/api/mrr")
def mrr(segments: list[str] | None = Query(None), plans: list[str] | None = Query(None)):
    s, p = _filters(segments, plans)
    return analytics.get_mrr_timeseries(s, p)


@app.get("/api/churn")
def churn(segments: list[str] | None = Query(None), plans: list[str] | None = Query(None)):
    s, p = _filters(segments, plans)
    return analytics.get_churn_timeseries(s, p)


@app.get("/api/cohort")
def cohort(segments: list[str] | None = Query(None), plans: list[str] | None = Query(None)):
    s, p = _filters(segments, plans)
    return analytics.get_cohort_retention(s, p)


@app.get("/api/usage-vs-churn")
def usage_vs_churn(segments: list[str] | None = Query(None), plans: list[str] | None = Query(None)):
    s, p = _filters(segments, plans)
    return analytics.get_usage_vs_churn(s, p)


@app.get("/api/revenue")
def revenue(segments: list[str] | None = Query(None), plans: list[str] | None = Query(None)):
    s, p = _filters(segments, plans)
    return analytics.get_revenue_by_segment(s, p)
