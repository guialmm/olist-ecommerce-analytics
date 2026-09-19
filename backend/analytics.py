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


def _filter_clauses(segments: list[str], plans: list[str], seg_col: str, plan_col: str):
    params, clauses = {}, []
    if segments:
        params["segments"] = tuple(segments)
        clauses.append(f"{seg_col} IN :segments")
    if plans:
        params["plans"] = tuple(plans)
        clauses.append(f"{plan_col} IN :plans")
    where = (" AND " + " AND ".join(clauses)) if clauses else ""
    return where, params


def get_filter_options() -> dict:
    segments = run("SELECT DISTINCT segment FROM users ORDER BY segment")["segment"].tolist()
    plans = run("SELECT name FROM plans ORDER BY tier")["name"].tolist()
    return {"segments": segments, "plans": plans}


def get_kpis(segments: list[str], plans: list[str]) -> dict:
    where, params = _filter_clauses(segments, plans, "u.segment", "p.name")
    df = run(
        f"""
        SELECT s.status, p.monthly_price
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
        JOIN users u ON u.id = s.user_id
        WHERE 1=1 {where}
        """,
        **params,
    )
    active = df[df.status == "active"]
    total = len(df)
    converted = df[df.status.isin(["active", "canceled"])].shape[0]
    return {
        "mrr": round(float(active.monthly_price.sum()), 2),
        "active_subscriptions": int(len(active)),
        "total_users": int(total),
        "conversion_rate": round(converted / total * 100, 1) if total else 0.0,
    }


def get_mrr_timeseries(segments: list[str], plans: list[str]) -> list[dict]:
    where, params = _filter_clauses(segments, plans, "segment", "plan_name")
    df = run(
        f"""
        SELECT active_month, ROUND(SUM(monthly_price), 2) AS mrr, COUNT(*) AS active_subscriptions
        FROM v_subscription_months
        WHERE 1=1 {where}
        GROUP BY active_month
        ORDER BY active_month
        """,
        **params,
    )
    return to_records(df)


def get_churn_timeseries(segments: list[str], plans: list[str]) -> list[dict]:
    where, params = _filter_clauses(segments, plans, "u.segment", "p.name")
    df = run(
        f"""
        SELECT DATE_FORMAT(se.event_date, '%Y-%m-01') AS month, COUNT(*) AS cancellations
        FROM subscription_events se
        JOIN subscriptions s ON s.id = se.subscription_id
        JOIN users u ON u.id = s.user_id
        JOIN plans p ON p.id = COALESCE(se.from_plan_id, s.plan_id)
        WHERE se.event_type = 'canceled' {where}
        GROUP BY month
        ORDER BY month
        """,
        **params,
    )
    return to_records(df)


def get_cohort_retention(segments: list[str], plans: list[str]) -> list[dict]:
    where, params = _filter_clauses(segments, plans, "segment", "plan_name")
    df = run(
        f"""
        SELECT
            cohort_month,
            PERIOD_DIFF(DATE_FORMAT(active_month, '%Y%m'), DATE_FORMAT(cohort_month, '%Y%m')) AS months_since_signup,
            COUNT(DISTINCT user_id) AS active_users
        FROM v_subscription_months
        WHERE 1=1 {where}
        GROUP BY cohort_month, months_since_signup
        ORDER BY cohort_month, months_since_signup
        """,
        **params,
    )
    if df.empty:
        return []
    cohort_size = df[df.months_since_signup == 0].set_index("cohort_month")["active_users"]
    df["cohort_size"] = df["cohort_month"].map(cohort_size)
    df["retention_pct"] = (df["active_users"] / df["cohort_size"] * 100).round(1)
    return to_records(df)


def get_usage_vs_churn(segments: list[str], plans: list[str]) -> dict:
    where, params = _filter_clauses(segments, plans, "u.segment", "p.name")
    df = run(
        f"""
        SELECT s.user_id, s.status, uu.sessions
        FROM subscriptions s
        JOIN users u ON u.id = s.user_id
        JOIN plans p ON p.id = s.plan_id
        JOIN v_user_monthly_usage uu ON uu.user_id = s.user_id
        WHERE s.status IN ('active', 'canceled') {where}
        """,
        **params,
    )
    if df.empty:
        return {"retained": None, "canceled": None}

    per_user = df.groupby(["user_id", "status"])["sessions"].mean().reset_index()

    def summarize(group_status: str, label: str):
        vals = per_user[per_user.status == group_status]["sessions"]
        if vals.empty:
            return None
        q1, median, q3 = vals.quantile([0.25, 0.5, 0.75])
        return {
            "label": label,
            "min": round(float(vals.min()), 2),
            "q1": round(float(q1), 2),
            "median": round(float(median), 2),
            "q3": round(float(q3), 2),
            "max": round(float(vals.max()), 2),
            "mean": round(float(vals.mean()), 2),
            "count": int(len(vals)),
        }

    return {
        "retained": summarize("active", "Retido"),
        "canceled": summarize("canceled", "Cancelado"),
    }


def get_revenue_by_segment(segments: list[str], plans: list[str]) -> list[dict]:
    where, params = _filter_clauses(segments, plans, "u.segment", "p.name")
    df = run(
        f"""
        SELECT u.segment, p.name AS plan_name, ROUND(SUM(p.monthly_price), 2) AS mrr
        FROM subscriptions s
        JOIN users u ON u.id = s.user_id
        JOIN plans p ON p.id = s.plan_id
        WHERE s.status = 'active' {where}
        GROUP BY u.segment, p.name
        ORDER BY u.segment
        """,
        **params,
    )
    return to_records(df)
