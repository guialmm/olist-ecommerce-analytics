"""Teste de integração do endpoint /api/review-risk-model.

Ao contrário de test_api.py, não depende do dataset da Olist estar
carregado (o modelo é um JSON estático versionado no repo) — por isso não
tem o mark `require_data` e roda mesmo sem os secrets do Kaggle no CI.
"""


def test_review_risk_model_returns_metrics_and_curve(client):
    res = client.get("/api/review-risk-model")
    assert res.status_code == 200
    body = res.json()
    assert 0 <= body["metrics"]["accuracy"] <= 1
    assert 0 <= body["metrics"]["roc_auc"] <= 1
    assert len(body["curve"]) > 0
    for point in body["curve"][:5]:
        assert 0 <= point["on_time_risk"] <= 1
        assert 0 <= point["late_risk"] <= 1


def test_review_risk_model_requires_auth(anon_client):
    res = anon_client.get("/api/review-risk-model")
    assert res.status_code == 401
