import os

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

DB_USER = os.getenv("MYSQL_USER", "saas_user")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "saas_pass")
DB_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
DB_PORT = os.getenv("MYSQL_PORT", "3307")
DB_NAME = os.getenv("MYSQL_DATABASE", "saas_analytics")

ENGINE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(ENGINE_URL, pool_pre_ping=True)


def query(sql: str, params: dict | None = None) -> pd.DataFrame:
    return pd.read_sql(sql, engine, params=params)
