"""Testes unitários do módulo review_risk.py — sem tocar no banco.

Usa o review_risk_model.json real (gerado por ml/train_review_risk_model.py
e versionado no repo) em vez de mockar, porque o objetivo aqui é validar o
comportamento matemático do sigmoid com os coeficientes reais do modelo.
"""

import review_risk


class TestPredict:
    def test_probability_is_between_zero_and_one(self):
        p = review_risk.predict(delivery_days=10, on_time=True)
        assert 0 <= p <= 1

    def test_late_delivery_increases_risk_vs_on_time(self):
        same_days = 15
        on_time_risk = review_risk.predict(delivery_days=same_days, on_time=True)
        late_risk = review_risk.predict(delivery_days=same_days, on_time=False)
        assert late_risk > on_time_risk

    def test_more_delivery_days_increases_risk(self):
        short = review_risk.predict(delivery_days=2, on_time=True)
        long = review_risk.predict(delivery_days=40, on_time=True)
        assert long > short

    def test_zero_days_on_time_is_low_risk(self):
        assert review_risk.predict(delivery_days=0, on_time=True) < 0.2


class TestGetModelInfo:
    def test_returns_metrics_and_curve(self):
        info = review_risk.get_model_info()
        assert "accuracy" in info["metrics"]
        assert "roc_auc" in info["metrics"]
        assert len(info["curve"]) > 0
        assert "trained_at" in info

    def test_curve_points_have_expected_shape(self):
        info = review_risk.get_model_info()
        point = info["curve"][0]
        assert "delivery_days" in point
        assert "on_time_risk" in point
        assert "late_risk" in point
