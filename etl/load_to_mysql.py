"""
Carrega os CSVs gerados em ../data/ para o MySQL (schema saas_analytics).

Pressupõe que o container MySQL já está de pé (docker compose up -d) e que
sql/schema.sql já rodou (acontece automaticamente na primeira subida do
container, via docker-entrypoint-initdb.d). A tabela `plans` já vem populada
pelo schema, então não é recarregada aqui.
"""

import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

DB_USER = os.getenv("MYSQL_USER", "saas_user")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "saas_pass")
DB_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
DB_PORT = os.getenv("MYSQL_PORT", "3306")
DB_NAME = os.getenv("MYSQL_DATABASE", "saas_analytics")

ENGINE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Ordem importa: respeita as foreign keys (users/plans -> subscriptions -> resto)
TABLES_IN_ORDER = [
    ("users", "users.csv"),
    ("subscriptions", "subscriptions.csv"),
    ("subscription_events", "subscription_events.csv"),
    ("payments", "payments.csv"),
    ("usage_events", "usage_events.csv"),
    ("support_tickets", "support_tickets.csv"),
]


def main():
    engine = create_engine(ENGINE_URL)

    with engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        for table, _ in TABLES_IN_ORDER:
            conn.execute(text(f"TRUNCATE TABLE {table}"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))

    for table, filename in TABLES_IN_ORDER:
        csv_path = DATA_DIR / filename
        if not csv_path.exists():
            raise FileNotFoundError(
                f"{csv_path} não encontrado — rode data_generation/generate_data.py antes."
            )
        df = pd.read_csv(csv_path)
        df.to_sql(table, engine, if_exists="append", index=False, chunksize=2000)
        print(f"{table}: {len(df)} linhas carregadas")

    print("Carga concluída.")


if __name__ == "__main__":
    main()
