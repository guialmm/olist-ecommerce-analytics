import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from db import engine  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _require_database():
    """Pula a suíte inteira com uma mensagem clara se o MySQL não estiver de pé.

    Os testes de API são de integração de propósito (rodam contra o banco
    real com o dataset da Olist carregado) — sem isso não tem o que testar.
    """
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
    except Exception as exc:  # noqa: BLE001
        pytest.skip(
            f"MySQL indisponível ({exc}). Rode `docker compose up -d` e "
            "`python etl/load_to_mysql.py` antes de rodar os testes.",
            allow_module_level=True,
        )


@pytest.fixture
def client():
    return TestClient(app)
