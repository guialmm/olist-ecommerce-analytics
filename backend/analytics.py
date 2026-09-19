import datetime

import numpy as np
import pandas as pd
from sqlalchemy import bindparam, text

from db import engine


def _native(v):
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.floating):
        return None if np.isnan(v) else float(v)
    if isinstance(v, (pd.Timestamp, datetime.date)):
        return v.strftime("%Y-%m-%d")
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    return v


def to_records(df: pd.DataFrame) -> list[dict]:
    return [{k: _native(v) for k, v in row.items()} for row in df.to_dict(orient="records")]


def run(sql: str, **params) -> pd.DataFrame:
    stmt = text(sql)
    for k, v in params.items():
        if isinstance(v, (list, tuple)):
            stmt = stmt.bindparams(bindparam(k, expanding=True))
    with engine.connect() as conn:
        return pd.read_sql(stmt, conn, params=params)


def _filter_clauses(states: list[str], categories: list[str], state_col: str, category_col: str):
    params, clauses = {}, []
    if states:
        params["states"] = tuple(states)
        clauses.append(f"{state_col} IN :states")
    if categories:
        params["categories"] = tuple(categories)
        clauses.append(f"{category_col} IN :categories")
    where = (" AND " + " AND ".join(clauses)) if clauses else ""
    return where, params


CATEGORY_EXPR = "COALESCE(pc.category_name_english, p.category_name, 'unknown')"

BASE_ORDER_ITEMS_JOIN = f"""
    FROM orders o
    JOIN customers c ON c.customer_id = o.customer_id
    JOIN order_items oi ON oi.order_id = o.order_id
    JOIN products p ON p.product_id = oi.product_id
    LEFT JOIN product_categories pc ON pc.category_name = p.category_name
    WHERE o.status NOT IN ('canceled', 'unavailable')
"""


def get_filter_options() -> dict:
    states = run("SELECT DISTINCT state FROM customers ORDER BY state")["state"].tolist()
    categories = run(
        f"""
        SELECT {CATEGORY_EXPR} AS category, ROUND(SUM(oi.price), 2) AS revenue
        {BASE_ORDER_ITEMS_JOIN}
        GROUP BY category
        ORDER BY revenue DESC
        LIMIT 20
        """
    )["category"].tolist()
    return {"states": states, "categories": categories}


def get_kpis(states: list[str], categories: list[str]) -> dict:
    where, params = _filter_clauses(states, categories, "c.state", CATEGORY_EXPR)
    df = run(
        f"""
        SELECT o.order_id, oi.price
        {BASE_ORDER_ITEMS_JOIN} {where}
        """,
        **params,
    )
    revenue = float(df["price"].sum())
    orders = df["order_id"].nunique()
    aov = revenue / orders if orders else 0.0

    delivery = run(
        f"""
        SELECT AVG(v.on_time) AS pct_on_time
        FROM v_delivery_performance v
        JOIN customers c ON c.customer_id = v.customer_id
        {("WHERE " + f"c.state IN :states") if states else ""}
        """,
        **({"states": tuple(states)} if states else {}),
    )
    pct_on_time = float(delivery["pct_on_time"].iloc[0] or 0) * 100

    return {
        "revenue": round(revenue, 2),
        "orders": int(orders),
        "avg_order_value": round(aov, 2),
        "pct_on_time": round(pct_on_time, 1),
    }


def get_revenue_timeseries(states: list[str], categories: list[str]) -> list[dict]:
    where, params = _filter_clauses(states, categories, "c.state", CATEGORY_EXPR)
    df = run(
        f"""
        SELECT DATE_FORMAT(o.purchase_ts, '%Y-%m-01') AS month,
               ROUND(SUM(oi.price), 2) AS revenue,
               COUNT(DISTINCT o.order_id) AS orders
        {BASE_ORDER_ITEMS_JOIN} {where}
        GROUP BY month
        ORDER BY month
        """,
        **params,
    )
    return to_records(df)


def get_order_status(states: list[str], categories: list[str]) -> list[dict]:
    params, clauses = {}, []
    joins = "FROM orders o JOIN customers c ON c.customer_id = o.customer_id"
    if categories:
        joins += """
            JOIN order_items oi ON oi.order_id = o.order_id
            JOIN products p ON p.product_id = oi.product_id
            LEFT JOIN product_categories pc ON pc.category_name = p.category_name
        """
        params["categories"] = tuple(categories)
        clauses.append(f"{CATEGORY_EXPR} IN :categories")
    if states:
        params["states"] = tuple(states)
        clauses.append("c.state IN :states")
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    df = run(
        f"""
        SELECT o.status, COUNT(DISTINCT o.order_id) AS n_orders
        {joins} {where}
        GROUP BY o.status
        ORDER BY n_orders DESC
        """,
        **params,
    )
    return to_records(df)


def get_delivery_vs_review(states: list[str], categories: list[str]) -> dict:
    params: dict = {}
    clauses = ["v.review_score IS NOT NULL"]
    if states:
        params["states"] = tuple(states)
        clauses.append("c.state IN :states")
    if categories:
        params["categories"] = tuple(categories)
        clauses.append(
            f"""v.order_id IN (
                SELECT oi.order_id FROM order_items oi
                JOIN products p ON p.product_id = oi.product_id
                LEFT JOIN product_categories pc ON pc.category_name = p.category_name
                WHERE {CATEGORY_EXPR} IN :categories
            )"""
        )
    df = run(
        f"""
        SELECT v.on_time, v.review_score
        FROM v_delivery_performance v
        JOIN customers c ON c.customer_id = v.customer_id
        WHERE {" AND ".join(clauses)}
        """,
        **params,
    )
    if df.empty:
        return {"on_time": [], "late": []}

    def score_distribution(subset: pd.DataFrame) -> list[dict]:
        counts = subset["review_score"].value_counts().reindex(range(1, 6), fill_value=0)
        total = int(counts.sum())
        return [
            {"score": int(s), "count": int(c), "pct": round(c / total * 100, 1) if total else 0.0}
            for s, c in counts.items()
        ]

    return {
        "on_time": score_distribution(df[df.on_time == 1]),
        "late": score_distribution(df[df.on_time == 0]),
    }


def get_top_categories(states: list[str], categories: list[str], limit: int = 10) -> list[dict]:
    where, params = _filter_clauses(states, categories, "c.state", CATEGORY_EXPR)
    df = run(
        f"""
        SELECT {CATEGORY_EXPR} AS category, ROUND(SUM(oi.price), 2) AS revenue
        {BASE_ORDER_ITEMS_JOIN} {where}
        GROUP BY category
        ORDER BY revenue DESC
        LIMIT {int(limit)}
        """,
        **params,
    )
    return to_records(df)


def get_revenue_by_state(states: list[str], categories: list[str], limit: int = 12) -> list[dict]:
    where, params = _filter_clauses(states, categories, "c.state", CATEGORY_EXPR)
    df = run(
        f"""
        SELECT c.state, ROUND(SUM(oi.price), 2) AS revenue
        {BASE_ORDER_ITEMS_JOIN} {where}
        GROUP BY c.state
        ORDER BY revenue DESC
        LIMIT {int(limit)}
        """,
        **params,
    )
    return to_records(df)


def get_payment_methods(states: list[str], categories: list[str]) -> list[dict]:
    params: dict = {}
    clauses = []
    if states:
        params["states"] = tuple(states)
        clauses.append("c.state IN :states")
    if categories:
        params["categories"] = tuple(categories)
        clauses.append(
            f"""op.order_id IN (
                SELECT oi.order_id FROM order_items oi
                JOIN products p ON p.product_id = oi.product_id
                LEFT JOIN product_categories pc ON pc.category_name = p.category_name
                WHERE {CATEGORY_EXPR} IN :categories
            )"""
        )
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    df = run(
        f"""
        SELECT op.payment_type, COUNT(DISTINCT op.order_id) AS n_orders, ROUND(SUM(op.value), 2) AS total_value
        FROM order_payments op
        JOIN orders o ON o.order_id = op.order_id
        JOIN customers c ON c.customer_id = o.customer_id
        {where}
        GROUP BY op.payment_type
        ORDER BY total_value DESC
        """,
        **params,
    )
    return to_records(df)
