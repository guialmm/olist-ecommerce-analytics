import datetime
import functools

import numpy as np
import pandas as pd
from sqlalchemy import bindparam, text

from db import engine

# O dataset (2016-2018) é histórico e só muda quando alguém roda o ETL de
# novo manualmente — não tem por que recalcular a mesma combinação de
# filtros repetidas vezes. Cache em memória do processo (some ao reiniciar
# o serviço), sem TTL, já que os dados não mudam em runtime.
_cache: dict = {}


def cached(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        def norm(v):
            return tuple(v) if isinstance(v, list) else v

        key = (fn.__name__, tuple(norm(a) for a in args), tuple(sorted((k, norm(v)) for k, v in kwargs.items())))
        if key not in _cache:
            _cache[key] = fn(*args, **kwargs)
        return _cache[key]

    return wrapper


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


def _filter_clauses(
    states: list[str],
    categories: list[str],
    state_col: str,
    category_col: str,
    start_date: str | None = None,
    end_date: str | None = None,
    date_col: str = "o.purchase_ts",
):
    params, clauses = {}, []
    if states:
        params["states"] = tuple(states)
        clauses.append(f"{state_col} IN :states")
    if categories:
        params["categories"] = tuple(categories)
        clauses.append(f"{category_col} IN :categories")
    if start_date:
        params["start_date"] = start_date
        clauses.append(f"{date_col} >= :start_date")
    if end_date:
        params["end_date"] = end_date
        clauses.append(f"{date_col} < DATE_ADD(:end_date, INTERVAL 1 DAY)")
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


@cached
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
    date_range = run("SELECT MIN(purchase_ts) AS min_date, MAX(purchase_ts) AS max_date FROM orders")
    return {
        "states": states,
        "categories": categories,
        "min_date": date_range["min_date"].iloc[0].strftime("%Y-%m-%d"),
        "max_date": date_range["max_date"].iloc[0].strftime("%Y-%m-%d"),
    }


def _pct_change(current: float, previous: float) -> float | None:
    if not previous:
        return None
    return round((current - previous) / previous * 100, 1)


def _monthly_trend(
    states: list[str], categories: list[str], start_date: str | None, end_date: str | None
) -> dict:
    """Compara o último mês "completo" de dados (dentro do período filtrado) contra o anterior.

    O dataset real da Olist tem uma cauda de poucos dias em set/out de 2018
    (coleta de dados interrompida no meio do mês) — meses com poucas dezenas
    de pedidos são descartados antes de calcular a variação, senão a
    comparação fica dominada por um artefato de coleta, não por um sinal
    real do negócio.
    """
    where, params = _filter_clauses(states, categories, "c.state", CATEGORY_EXPR, start_date, end_date)
    revenue_df = run(
        f"""
        SELECT DATE_FORMAT(o.purchase_ts, '%Y-%m-01') AS month,
               SUM(oi.price) AS revenue, COUNT(DISTINCT o.order_id) AS orders
        {BASE_ORDER_ITEMS_JOIN} {where}
        GROUP BY month
        HAVING orders >= 100
        ORDER BY month
        """,
        **params,
    )
    if len(revenue_df) < 2:
        return {}
    last, prev = revenue_df.iloc[-1], revenue_df.iloc[-2]

    delivery_where, delivery_params = _filter_clauses(
        states, categories, "c.state", CATEGORY_EXPR, start_date, end_date
    )
    delivery_df = run(
        f"""
        SELECT DATE_FORMAT(o.purchase_ts, '%Y-%m-01') AS month,
               AVG(v.on_time) AS pct_on_time, COUNT(*) AS n
        FROM v_delivery_performance v
        JOIN orders o ON o.order_id = v.order_id
        JOIN customers c ON c.customer_id = v.customer_id
        {"JOIN order_items oi ON oi.order_id = v.order_id JOIN products p ON p.product_id = oi.product_id LEFT JOIN product_categories pc ON pc.category_name = p.category_name" if categories else ""}
        WHERE 1=1 {delivery_where}
        GROUP BY month
        HAVING n >= 50
        ORDER BY month
        """,
        **delivery_params,
    )
    on_time_delta = None
    if len(delivery_df) >= 2 and delivery_df.iloc[-1]["month"] == last["month"]:
        on_time_delta = round(
            (float(delivery_df.iloc[-1]["pct_on_time"]) - float(delivery_df.iloc[-2]["pct_on_time"])) * 100, 1
        )

    last_aov = last["revenue"] / last["orders"] if last["orders"] else 0
    prev_aov = prev["revenue"] / prev["orders"] if prev["orders"] else 0

    return {
        "latest_month": last["month"],
        "revenue_trend_pct": _pct_change(last["revenue"], prev["revenue"]),
        "orders_trend_pct": _pct_change(last["orders"], prev["orders"]),
        "avg_order_value_trend_pct": _pct_change(last_aov, prev_aov),
        "pct_on_time_trend_pct": on_time_delta,
    }


@cached
def get_kpis(
    states: list[str], categories: list[str], start_date: str | None = None, end_date: str | None = None
) -> dict:
    where, params = _filter_clauses(states, categories, "c.state", CATEGORY_EXPR, start_date, end_date)
    df = run(
        f"""
        SELECT SUM(oi.price) AS revenue, COUNT(DISTINCT o.order_id) AS orders
        {BASE_ORDER_ITEMS_JOIN} {where}
        """,
        **params,
    )
    revenue = float(df["revenue"].iloc[0] or 0)
    orders = int(df["orders"].iloc[0] or 0)
    aov = revenue / orders if orders else 0.0

    delivery_clauses, delivery_params = [], {}
    delivery_joins = "JOIN customers c ON c.customer_id = v.customer_id"
    if states:
        delivery_params["states"] = tuple(states)
        delivery_clauses.append("c.state IN :states")
    if start_date or end_date:
        delivery_joins += " JOIN orders o ON o.order_id = v.order_id"
        if start_date:
            delivery_params["start_date"] = start_date
            delivery_clauses.append("o.purchase_ts >= :start_date")
        if end_date:
            delivery_params["end_date"] = end_date
            delivery_clauses.append("o.purchase_ts < DATE_ADD(:end_date, INTERVAL 1 DAY)")
    delivery_where = (" WHERE " + " AND ".join(delivery_clauses)) if delivery_clauses else ""
    delivery = run(
        f"SELECT AVG(v.on_time) AS pct_on_time FROM v_delivery_performance v {delivery_joins} {delivery_where}",
        **delivery_params,
    )
    pct_on_time = float(delivery["pct_on_time"].iloc[0] or 0) * 100

    return {
        "revenue": round(revenue, 2),
        "orders": int(orders),
        "avg_order_value": round(aov, 2),
        "pct_on_time": round(pct_on_time, 1),
        **_monthly_trend(states, categories, start_date, end_date),
    }


@cached
def get_revenue_timeseries(
    states: list[str], categories: list[str], start_date: str | None = None, end_date: str | None = None
) -> list[dict]:
    where, params = _filter_clauses(states, categories, "c.state", CATEGORY_EXPR, start_date, end_date)
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


@cached
def get_order_status(
    states: list[str], categories: list[str], start_date: str | None = None, end_date: str | None = None
) -> list[dict]:
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
    if start_date:
        params["start_date"] = start_date
        clauses.append("o.purchase_ts >= :start_date")
    if end_date:
        params["end_date"] = end_date
        clauses.append("o.purchase_ts < DATE_ADD(:end_date, INTERVAL 1 DAY)")
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


@cached
def get_delivery_vs_review(
    states: list[str], categories: list[str], start_date: str | None = None, end_date: str | None = None
) -> dict:
    params: dict = {}
    clauses = ["v.review_score IS NOT NULL"]
    joins = "JOIN customers c ON c.customer_id = v.customer_id"
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
    if start_date or end_date:
        joins += " JOIN orders o ON o.order_id = v.order_id"
        if start_date:
            params["start_date"] = start_date
            clauses.append("o.purchase_ts >= :start_date")
        if end_date:
            params["end_date"] = end_date
            clauses.append("o.purchase_ts < DATE_ADD(:end_date, INTERVAL 1 DAY)")
    df = run(
        f"""
        SELECT v.on_time, v.review_score
        FROM v_delivery_performance v
        {joins}
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


@cached
def get_top_categories(
    states: list[str],
    categories: list[str],
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 10,
) -> list[dict]:
    # Ignora o próprio filtro de categoria: esse gráfico compara categorias
    # entre si, então precisa continuar mostrando todas (o frontend destaca
    # a selecionada) em vez de encolher pra uma barra só quando o usuário
    # clica numa delas pra filtrar o resto do dashboard.
    where, params = _filter_clauses(states, [], "c.state", CATEGORY_EXPR, start_date, end_date)
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


@cached
def get_revenue_by_state(
    states: list[str],
    categories: list[str],
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 12,
) -> list[dict]:
    # Ignora o próprio filtro de estado — mesmo motivo de get_top_categories.
    where, params = _filter_clauses([], categories, "c.state", CATEGORY_EXPR, start_date, end_date)
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


@cached
def get_payment_methods(
    states: list[str], categories: list[str], start_date: str | None = None, end_date: str | None = None
) -> list[dict]:
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
    if start_date:
        params["start_date"] = start_date
        clauses.append("o.purchase_ts >= :start_date")
    if end_date:
        params["end_date"] = end_date
        clauses.append("o.purchase_ts < DATE_ADD(:end_date, INTERVAL 1 DAY)")
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


@cached
def get_freight_by_state(
    states: list[str],
    categories: list[str],
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 12,
) -> list[dict]:
    # Ignora o próprio filtro de estado — mesmo motivo de get_top_categories.
    where, params = _filter_clauses([], categories, "c.state", CATEGORY_EXPR, start_date, end_date)
    df = run(
        f"""
        SELECT
            c.state,
            ROUND(AVG(oi.freight_value / NULLIF(oi.price, 0)) * 100, 1) AS avg_freight_pct,
            ROUND(AVG(oi.freight_value), 2) AS avg_freight_value
        {BASE_ORDER_ITEMS_JOIN} {where}
        GROUP BY c.state
        ORDER BY avg_freight_pct DESC
        LIMIT {int(limit)}
        """,
        **params,
    )
    return to_records(df)


@cached
def get_geo_density(
    states: list[str],
    categories: list[str],
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict]:
    where, params = _filter_clauses(states, categories, "c.state", CATEGORY_EXPR, start_date, end_date)
    df = run(
        f"""
        SELECT
            g.lat, g.lng, g.city, g.state,
            ROUND(SUM(oi.price), 2)    AS revenue,
            COUNT(DISTINCT o.order_id) AS orders
        FROM orders o
        JOIN customers c ON c.customer_id = o.customer_id
        JOIN order_items oi ON oi.order_id = o.order_id
        JOIN products p ON p.product_id = oi.product_id
        LEFT JOIN product_categories pc ON pc.category_name = p.category_name
        JOIN geolocation g ON g.zip_code_prefix = c.zip_code_prefix
        WHERE o.status NOT IN ('canceled', 'unavailable') {where}
        GROUP BY g.lat, g.lng, g.city, g.state
        """,
        **params,
    )
    return to_records(df)


@cached
def get_top_sellers(
    states: list[str],
    categories: list[str],
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 10,
) -> list[dict]:
    where, params = _filter_clauses(states, categories, "c.state", CATEGORY_EXPR, start_date, end_date)
    df = run(
        f"""
        SELECT
            LEFT(oi.seller_id, 8) AS seller_id,
            s.state AS seller_state,
            ROUND(SUM(oi.price), 2) AS revenue,
            COUNT(DISTINCT oi.order_id) AS orders
        FROM orders o
        JOIN customers c ON c.customer_id = o.customer_id
        JOIN order_items oi ON oi.order_id = o.order_id
        JOIN sellers s ON s.seller_id = oi.seller_id
        JOIN products p ON p.product_id = oi.product_id
        LEFT JOIN product_categories pc ON pc.category_name = p.category_name
        WHERE o.status NOT IN ('canceled', 'unavailable') {where}
        GROUP BY oi.seller_id, s.state
        ORDER BY revenue DESC
        LIMIT {int(limit)}
        """,
        **params,
    )
    return to_records(df)
