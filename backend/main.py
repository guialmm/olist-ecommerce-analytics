from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

import analytics

app = FastAPI(title="Olist E-Commerce Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _filters(states: list[str] | None, categories: list[str] | None):
    return states or [], categories or []


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/filters")
def filters():
    return analytics.get_filter_options()


@app.get("/api/kpis")
def kpis(states: list[str] | None = Query(None), categories: list[str] | None = Query(None)):
    s, c = _filters(states, categories)
    return analytics.get_kpis(s, c)


@app.get("/api/revenue")
def revenue(states: list[str] | None = Query(None), categories: list[str] | None = Query(None)):
    s, c = _filters(states, categories)
    return analytics.get_revenue_timeseries(s, c)


@app.get("/api/order-status")
def order_status(states: list[str] | None = Query(None), categories: list[str] | None = Query(None)):
    s, c = _filters(states, categories)
    return analytics.get_order_status(s, c)


@app.get("/api/delivery-vs-review")
def delivery_vs_review(states: list[str] | None = Query(None), categories: list[str] | None = Query(None)):
    s, c = _filters(states, categories)
    return analytics.get_delivery_vs_review(s, c)


@app.get("/api/top-categories")
def top_categories(states: list[str] | None = Query(None), categories: list[str] | None = Query(None)):
    s, c = _filters(states, categories)
    return analytics.get_top_categories(s, c)


@app.get("/api/revenue-by-state")
def revenue_by_state(states: list[str] | None = Query(None), categories: list[str] | None = Query(None)):
    s, c = _filters(states, categories)
    return analytics.get_revenue_by_state(s, c)


@app.get("/api/payment-methods")
def payment_methods(states: list[str] | None = Query(None), categories: list[str] | None = Query(None)):
    s, c = _filters(states, categories)
    return analytics.get_payment_methods(s, c)
