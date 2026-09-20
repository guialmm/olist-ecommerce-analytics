import os

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

DB_USER = os.getenv("MYSQL_USER", "olist_user")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "olist_pass")
DB_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
DB_PORT = os.getenv("MYSQL_PORT", "3307")
DB_NAME = os.getenv("MYSQL_DATABASE", "olist_analytics")

# Provedores de MySQL gerenciado (ex: Aiven) exigem TLS — aponta pro
# certificado CA via env var só em produção; localmente/Docker fica sem.
_ssl_ca = os.getenv("MYSQL_SSL_CA")
connect_args = {"ssl": {"ca": _ssl_ca}} if _ssl_ca else {}

ENGINE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(ENGINE_URL, pool_pre_ping=True, connect_args=connect_args)


def query(sql: str, params: dict | None = None) -> pd.DataFrame:
    return pd.read_sql(sql, engine, params=params)
