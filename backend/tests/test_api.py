"""Testes de integração da API — rodam contra o MySQL real com o dataset da Olist.

Requer: docker compose up -d && python etl/load_to_mysql.py
Se o banco não estiver disponível, a suíte inteira é pulada (ver conftest.py).
"""


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


def test_category_filter_narrows_results_consistently(client):
    res = client.get("/api/filters").json()
    top_category = res["categories"][0]
    filtered = client.get("/api/top-categories", params={"categories": top_category}).json()
    assert len(filtered) == 1
    assert filtered[0]["category"] == top_category
