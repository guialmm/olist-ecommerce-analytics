"""
Serve o modelo de risco de avaliação negativa treinado offline (ver
ml/train_review_risk_model.py). Propositalmente não depende de
scikit-learn em runtime — só carrega os coeficientes (intercepto + 2
pesos) de um JSON e calcula o sigmoid na mão.
"""

import json
import math
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent / "review_risk_model.json"

_model: dict | None = None


class ModelNotAvailable(Exception):
    pass


def _load() -> dict:
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise ModelNotAvailable(
                "Modelo não encontrado — rode ml/train_review_risk_model.py."
            )
        _model = json.loads(MODEL_PATH.read_text())
    return _model


def predict(delivery_days: float, on_time: bool) -> float:
    m = _load()
    z = m["intercept"] + m["coef_delivery_days"] * delivery_days + m["coef_on_time"] * on_time
    return 1 / (1 + math.exp(-z))


def get_model_info() -> dict:
    m = _load()
    return {"metrics": m["metrics"], "curve": m["curve"], "trained_at": m["trained_at"]}
