"""
Dashboard SaaS Analytics — Streamlit.

Roda com: streamlit run dashboard/app.py
Requer o MySQL de pé (docker compose up -d) e os dados já carregados
(data_generation/generate_data.py + etl/load_to_mysql.py).
"""

import os

import pandas as pd
import plotly.express as px
import streamlit as st
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

DB_USER = os.getenv("MYSQL_USER", "saas_user")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "saas_pass")
DB_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
DB_PORT = os.getenv("MYSQL_PORT", "3306")
DB_NAME = os.getenv("MYSQL_DATABASE", "saas_analytics")

st.set_page_config(page_title="SaaS Analytics", layout="wide")


@st.cache_resource
def get_engine():
    url = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    return create_engine(url)


@st.cache_data(ttl=300)
def load_data():
    engine = get_engine()
    subs = pd.read_sql(
        """
        SELECT s.id, s.user_id, s.plan_id, s.start_date, s.end_date, s.status,
               p.name AS plan_name, p.monthly_price, u.segment, u.country, u.signup_date
        FROM subscriptions s
        JOIN plans p ON p.id = s.plan_id
        JOIN users u ON u.id = s.user_id
        """,
        engine,
        parse_dates=["start_date", "end_date", "signup_date"],
    )
    mrr = pd.read_sql("SELECT * FROM v_mrr_by_month", engine, parse_dates=["active_month"])
    sub_months = pd.read_sql(
        "SELECT * FROM v_subscription_months", engine,
        parse_dates=["cohort_month", "active_month"],
    )
    usage = pd.read_sql(
        "SELECT * FROM v_user_monthly_usage", engine, parse_dates=["usage_month"]
    )
    events = pd.read_sql(
        "SELECT * FROM subscription_events", engine, parse_dates=["event_date"]
    )
    return subs, mrr, sub_months, usage, events


subs, mrr, sub_months, usage, events = load_data()

st.title("📊 SaaS Analytics — Dashboard")

# ---------------- Sidebar filters ----------------
st.sidebar.header("Filtros")
segments = st.sidebar.multiselect(
    "Segmento", options=sorted(subs["segment"].unique()), default=list(subs["segment"].unique())
)
plans = st.sidebar.multiselect(
    "Plano", options=sorted(subs["plan_name"].unique()), default=list(subs["plan_name"].unique())
)

subs_f = subs[subs["segment"].isin(segments) & subs["plan_name"].isin(plans)]
sub_months_f = sub_months[sub_months["segment"].isin(segments)]

# ---------------- KPIs ----------------
active_now = subs_f[subs_f["status"] == "active"]
current_mrr = (active_now["monthly_price"]).sum()
total_users = subs_f["user_id"].nunique()
canceled = subs_f[subs_f["status"] == "canceled"].shape[0]
converted_total = subs_f[subs_f["status"].isin(["active", "canceled"])].shape[0]
trial_total = subs_f.shape[0]
conversion_rate = converted_total / trial_total * 100 if trial_total else 0

col1, col2, col3, col4 = st.columns(4)
col1.metric("MRR atual", f"US$ {current_mrr:,.0f}")
col2.metric("Assinaturas ativas", f"{active_now.shape[0]:,}")
col3.metric("Total de usuários (filtro)", f"{total_users:,}")
col4.metric("Taxa de conversão trial→pago", f"{conversion_rate:.1f}%")

st.divider()

# ---------------- MRR over time ----------------
st.subheader("MRR ao longo do tempo")
mrr_plot = mrr.sort_values("active_month")
fig_mrr = px.line(mrr_plot, x="active_month", y="mrr", markers=True)
st.plotly_chart(fig_mrr, use_container_width=True)

# ---------------- Churn over time ----------------
st.subheader("Cancelamentos por mês")
cancels = events[events["event_type"] == "canceled"].copy()
cancels["month"] = cancels["event_date"].dt.to_period("M").dt.to_timestamp()
cancels_by_month = cancels.groupby("month").size().reset_index(name="cancellations")
fig_churn = px.bar(cancels_by_month, x="month", y="cancellations")
st.plotly_chart(fig_churn, use_container_width=True)

st.divider()

# ---------------- Cohort retention heatmap ----------------
st.subheader("Cohort retention")
cohort = sub_months_f.copy()
cohort["months_since_signup"] = (
    (cohort["active_month"].dt.year - cohort["cohort_month"].dt.year) * 12
    + (cohort["active_month"].dt.month - cohort["cohort_month"].dt.month)
)
cohort_pivot = (
    cohort.groupby(["cohort_month", "months_since_signup"])["user_id"]
    .nunique()
    .reset_index()
)
cohort_size = cohort_pivot[cohort_pivot["months_since_signup"] == 0].set_index("cohort_month")["user_id"]
cohort_pivot["cohort_size"] = cohort_pivot["cohort_month"].map(cohort_size)
cohort_pivot["retention_pct"] = (cohort_pivot["user_id"] / cohort_pivot["cohort_size"] * 100).round(1)

heatmap_df = cohort_pivot.pivot(index="cohort_month", columns="months_since_signup", values="retention_pct")
heatmap_df.index = heatmap_df.index.strftime("%Y-%m")

fig_cohort = px.imshow(
    heatmap_df,
    labels=dict(x="Meses desde o cadastro", y="Cohort", color="Retenção %"),
    color_continuous_scale="Blues",
    aspect="auto",
)
st.plotly_chart(fig_cohort, use_container_width=True)

st.divider()

# ---------------- Usage vs churn ----------------
# Compara só quem virou cliente pagante de fato (active/canceled) — inclui trial/expired
# aqui distorceria a média de "retido" pra baixo, já que quem nem converteu mal usou o produto.
st.subheader("Uso do produto: retidos vs. cancelados")
subs_status = subs_f[subs_f["status"].isin(["active", "canceled"])][["user_id", "status"]].drop_duplicates()
usage_avg = usage.groupby("user_id")["sessions"].mean().reset_index(name="avg_sessions")
merged = subs_status.merge(usage_avg, on="user_id", how="left").fillna(0)
merged["group"] = merged["status"].map(lambda s: "Cancelado" if s == "canceled" else "Retido")
fig_usage = px.box(merged, x="group", y="avg_sessions", points="outliers")
st.plotly_chart(fig_usage, use_container_width=True)

st.divider()

# ---------------- Revenue by segment/plan ----------------
st.subheader("Receita por segmento e plano (assinaturas ativas)")
rev = active_now.groupby(["segment", "plan_name"])["monthly_price"].sum().reset_index()
fig_rev = px.bar(rev, x="segment", y="monthly_price", color="plan_name", barmode="stack")
st.plotly_chart(fig_rev, use_container_width=True)
