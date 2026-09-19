import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import auth  # noqa: E402
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


@pytest.fixture(scope="session")
def _orders_loaded() -> bool:
    with engine.connect() as conn:
        count = conn.exec_driver_sql("SELECT COUNT(*) FROM orders").scalar()
    return bool(count and count > 0)


@pytest.fixture(scope="session")
def require_data(_orders_loaded):
    """Pula (não falha) testes que fazem asserções sobre o dataset real.

    O schema pode estar de pé sem os dados carregados — por exemplo no CI,
    quando os secrets do Kaggle (KAGGLE_USERNAME/KAGGLE_KEY) não estão
    configurados no repositório. Isso não é um bug do código, então os
    testes que dependem de dado real pulam em vez de falhar.
    """
    if not _orders_loaded:
        pytest.skip(
            "Dataset da Olist não carregado — rode `python etl/load_to_mysql.py` "
            "(ou configure os secrets KAGGLE_USERNAME/KAGGLE_KEY no CI)."
        )


@pytest.fixture
def client():
    """TestClient já autenticado — a maioria dos endpoints exige um token."""
    c = TestClient(app)
    token = auth.create_access_token(auth.DEMO_USERNAME)
    c.headers.update({"Authorization": f"Bearer {token}"})
    return c


@pytest.fixture
def anon_client():
    """Cliente sem token, para testar os próprios endpoints de autenticação."""
    return TestClient(app)
