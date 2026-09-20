"""Testes de integração da API — rodam contra o MySQL real com o dataset da Olist.

Requer: docker compose up -d && python etl/load_to_mysql.py
Se o banco não estiver disponível, a suíte inteira é pulada; se estiver de pé
mas sem dados carregados, os testes deste módulo pulam (ver conftest.py).
"""

import pytest

pytestmark = pytest.mark.usefixtures("require_data")


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_filters_returns_states_categories_and_date_range(client):
    res = client.get("/api/filters")
    assert res.status_code == 200
    body = res.json()
    assert "SP" in body["states"]
    assert len(body["categories"]) > 0
    assert body["min_date"] < body["max_date"]


def test_kpis_without_filters(client):
    res = client.get("/api/kpis")
    assert res.status_code == 200
    body = res.json()
    assert body["revenue"] > 0
    assert body["orders"] > 0
    assert 0 <= body["pct_on_time"] <= 100
    assert body["avg_order_value"] == round(body["revenue"] / body["orders"], 2)


def test_kpis_filtered_by_state_is_subset_of_total(client):
    total = client.get("/api/kpis").json()
    filtered = client.get("/api/kpis", params={"states": "SP"}).json()
    assert filtered["revenue"] < total["revenue"]
    assert filtered["orders"] < total["orders"]


def test_kpis_with_date_range(client):
    res = client.get("/api/kpis", params={"start_date": "2018-01-01", "end_date": "2018-03-31"})
    assert res.status_code == 200
    body = res.json()
    assert body["revenue"] > 0
    assert body["latest_month"] == "2018-03-01"


def test_kpis_unknown_state_returns_zeroed_result_not_error(client):
    res = client.get("/api/kpis", params={"states": "ZZ"})
    assert res.status_code == 200
    body = res.json()
    assert body["revenue"] == 0
    assert body["orders"] == 0


def test_kpis_invalid_date_format_returns_422(client):
    res = client.get("/api/kpis", params={"start_date": "not-a-date"})
    assert res.status_code == 422


def test_kpis_start_after_end_returns_400(client):
    res = client.get("/api/kpis", params={"start_date": "2018-06-01", "end_date": "2018-01-01"})
    assert res.status_code == 400
    assert "start_date" in res.json()["detail"]


def test_revenue_timeseries_is_chronologically_sorted(client):
    res = client.get("/api/revenue")
    assert res.status_code == 200
    months = [row["month"] for row in res.json()]
    assert months == sorted(months)


def test_order_status_covers_known_statuses(client):
    res = client.get("/api/order-status")
    assert res.status_code == 200
    statuses = {row["status"] for row in res.json()}
    assert "delivered" in statuses


def test_delivery_vs_review_score_distribution_sums_to_100_pct(client):
    res = client.get("/api/delivery-vs-review")
    assert res.status_code == 200
    body = res.json()
    for group in ("on_time", "late"):
        assert len(body[group]) == 5
        total_pct = sum(bucket["pct"] for bucket in body[group])
        assert abs(total_pct - 100) < 0.5


def test_top_categories_returns_at_most_ten_sorted_desc(client):
    res = client.get("/api/top-categories")
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) <= 10
    revenues = [row["revenue"] for row in rows]
    assert revenues == sorted(revenues, reverse=True)


def test_revenue_by_state_sp_is_top(client):
    res = client.get("/api/revenue-by-state")
    assert res.status_code == 200
    rows = res.json()
    assert rows[0]["state"] == "SP"


def test_payment_methods_credit_card_dominates(client):
    res = client.get("/api/payment-methods")
    assert res.status_code == 200
    rows = res.json()
    assert rows[0]["payment_type"] == "credit_card"


def test_freight_by_state_percentages_are_positive(client):
    res = client.get("/api/freight-by-state")
    assert res.status_code == 200
    for row in res.json():
        assert row["avg_freight_pct"] > 0


def test_top_sellers_returns_short_ids_not_full_hash(client):
    res = client.get("/api/top-sellers")
    assert res.status_code == 200
    for row in res.json():
        assert len(row["seller_id"]) == 8


def test_category_filter_does_not_narrow_top_categories(client):
    # top-categories, revenue-by-state e freight-by-state ignoram o próprio
    # filtro da dimensão que exibem de propósito — são gráficos de
    # comparação (o frontend destaca a barra selecionada em vez de
    # encolher o gráfico pra uma barra só quando o usuário clica pra
    # filtrar o resto do dashboard).
    unfiltered = client.get("/api/top-categories").json()
    res = client.get("/api/filters").json()
    top_category = res["categories"][0]
    filtered = client.get("/api/top-categories", params={"categories": top_category}).json()
    assert len(filtered) == len(unfiltered)


def test_category_filter_still_narrows_other_endpoints(client):
    res = client.get("/api/filters").json()
    top_category = res["categories"][0]
    total = client.get("/api/kpis").json()
    filtered = client.get("/api/kpis", params={"categories": top_category}).json()
    assert filtered["revenue"] < total["revenue"]


def test_state_filter_does_not_narrow_revenue_by_state_or_freight_by_state(client):
    unfiltered_revenue = client.get("/api/revenue-by-state").json()
    unfiltered_freight = client.get("/api/freight-by-state").json()
    filtered_revenue = client.get("/api/revenue-by-state", params={"states": "SP"}).json()
    filtered_freight = client.get("/api/freight-by-state", params={"states": "SP"}).json()
    assert len(filtered_revenue) == len(unfiltered_revenue)
    assert len(filtered_freight) == len(unfiltered_freight)


def test_geo_density_returns_points_with_valid_brazil_coordinates(client):
    res = client.get("/api/geo-density")
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) > 0
    for row in rows[:50]:
        assert -34 <= row["lat"] <= 6
        assert -74 <= row["lng"] <= -32
        assert row["orders"] > 0
        assert row["revenue"] > 0


def test_geo_density_filtered_by_state_only_returns_that_state(client):
    res = client.get("/api/geo-density", params={"states": "SP"})
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) > 0
    assert all(row["state"] == "SP" for row in rows)


def test_geo_density_unknown_state_returns_empty_list(client):
    res = client.get("/api/geo-density", params={"states": "ZZ"})
    assert res.status_code == 200
    assert res.json() == []
