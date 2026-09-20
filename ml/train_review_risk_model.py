"""
Treina um modelo simples de risco de avaliação negativa: dado o tempo de
entrega (em dias) e se o pedido chegou no prazo, qual a probabilidade da
nota ser <= 2?

`on_time` não é redundante com `delivery_days` — ele carrega a informação
da promessa de entrega (o prazo estimado), que `delivery_days` sozinho não
tem: uma entrega de 20 dias prometida em 25 é muito diferente de uma de
20 dias prometida em 10.

O modelo é uma regressão logística com só 2 features — de propósito.
Servir em produção não precisa de scikit-learn: salvamos os coeficientes
(intercepto + 2 pesos) e uma curva pré-computada num JSON pequeno, e a API
calcula o sigmoid na mão (ver backend/review_risk.py).

Uso:
    docker compose up -d && python etl/load_to_mysql.py   # dado carregado
    python ml/train_review_risk_model.py
"""

import json
import os
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split
from sqlalchemy import create_engine

load_dotenv()

DB_USER = os.getenv("MYSQL_USER", "olist_user")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "olist_pass")
DB_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
DB_PORT = os.getenv("MYSQL_PORT", "3307")
DB_NAME = os.getenv("MYSQL_DATABASE", "olist_analytics")

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "backend" / "review_risk_model.json"

MAX_DELIVERY_DAYS_CURVE = 45


def load_training_data(engine) -> pd.DataFrame:
    df = pd.read_sql(
        """
        SELECT delivery_days, on_time, review_score
        FROM v_delivery_performance
        WHERE delivery_days IS NOT NULL AND delivery_days >= 0 AND delivery_days <= 200
        """,
        engine,
    )
    df["bad_review"] = (df["review_score"] <= 2).astype(int)
    return df


# delivery_days varia de 0 a ~200 e on_time é 0/1 — escalas bem diferentes
# fazem o L-BFGS instabilizar (overflow nas iterações antes de convergir).
# Divide delivery_days por esse fator só durante o fit; como não há
# centralização (só escala), dá pra converter o coeficiente de volta pra
# dias corridos depois (coef_raw = coef_escalado / DELIVERY_DAYS_SCALE).
DELIVERY_DAYS_SCALE = 10.0


def train(df: pd.DataFrame) -> tuple[LogisticRegression, dict]:
    X = df[["delivery_days", "on_time"]].copy()
    X["delivery_days"] = X["delivery_days"] / DELIVERY_DAYS_SCALE
    y = df["bad_review"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = LogisticRegression()
    model.fit(X_train, y_train)

    proba_test = model.predict_proba(X_test)[:, 1]
    pred_test = model.predict(X_test)
    tn, fp, fn, tp = confusion_matrix(y_test, pred_test).ravel()

    metrics = {
        "accuracy": round(accuracy_score(y_test, pred_test), 4),
        "roc_auc": round(roc_auc_score(y_test, proba_test), 4),
        "base_rate": round(float(y.mean()), 4),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "confusion_matrix": {
            "true_negative": int(tn),
            "false_positive": int(fp),
            "false_negative": int(fn),
            "true_positive": int(tp),
        },
    }
    return model, metrics


def build_curve(model: LogisticRegression) -> list[dict]:
    days = np.arange(0, MAX_DELIVERY_DAYS_CURVE + 1)
    scaled_days = days / DELIVERY_DAYS_SCALE
    cols = ["delivery_days", "on_time"]
    on_time_risk = model.predict_proba(
        pd.DataFrame({"delivery_days": scaled_days, "on_time": 1}, columns=cols)
    )[:, 1]
    late_risk = model.predict_proba(
        pd.DataFrame({"delivery_days": scaled_days, "on_time": 0}, columns=cols)
    )[:, 1]
    return [
        {
            "delivery_days": int(d),
            "on_time_risk": round(float(ot), 4),
            "late_risk": round(float(lt), 4),
        }
        for d, ot, lt in zip(days, on_time_risk, late_risk)
    ]


def main():
    engine = create_engine(
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    df = load_training_data(engine)
    if len(df) < 100:
        print(f"Só {len(df)} linhas de treino — carregue o dataset antes (etl/load_to_mysql.py).")
        sys.exit(1)

    # O L-BFGS-B do scipy testa passos grandes durante a busca de linha e
    # estoura RuntimeWarning (overflow/divide-by-zero) em avaliações
    # intermediárias descartadas — não afeta o resultado final (mesmos
    # coeficientes em várias rodadas independentes, com configs diferentes).
    warnings.filterwarnings("ignore", category=RuntimeWarning, module="sklearn")

    model, metrics = train(df)
    coef = model.coef_[0]
    # Converte o coeficiente de volta pra escala de dias corridos (ver
    # DELIVERY_DAYS_SCALE) — a API faz o sigmoid direto em cima de
    # delivery_days cru, sem reimplementar a escala do treino.
    coef_delivery_days_raw = coef[0] / DELIVERY_DAYS_SCALE

    output = {
        "intercept": round(float(model.intercept_[0]), 6),
        "coef_delivery_days": round(float(coef_delivery_days_raw), 6),
        "coef_on_time": round(float(coef[1]), 6),
        "metrics": metrics,
        "curve": build_curve(model),
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    OUTPUT_PATH.write_text(json.dumps(output, indent=2))
    print(f"Modelo salvo em {OUTPUT_PATH}")
    print(f"Acurácia: {metrics['accuracy']}  ROC-AUC: {metrics['roc_auc']}  base_rate: {metrics['base_rate']}")


if __name__ == "__main__":
    main()
