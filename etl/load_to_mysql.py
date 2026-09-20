"""
Carrega o dataset real da Olist (baixado do Kaggle) para o MySQL
(schema olist_analytics).

Antes de rodar:
1. docker compose up -d           # sobe o MySQL e cria o schema
2. Baixe o dataset em data/raw/:
     kaggle datasets download -d olistbr/brazilian-ecommerce -p data/raw --unzip
   (precisa de uma conta Kaggle + `kaggle.json` configurado — kaggle.com/settings)
3. python etl/load_to_mysql.py
"""

import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"

DB_USER = os.getenv("MYSQL_USER", "olist_user")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "olist_pass")
DB_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
DB_PORT = os.getenv("MYSQL_PORT", "3307")
DB_NAME = os.getenv("MYSQL_DATABASE", "olist_analytics")

ENGINE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


def require(filename: str) -> Path:
    path = RAW_DIR / filename
    if not path.exists():
        raise FileNotFoundError(
            f"{path} não encontrado.\n"
            "Baixe o dataset com:\n"
            "  kaggle datasets download -d olistbr/brazilian-ecommerce -p data/raw --unzip"
        )
    return path


def load_customers() -> pd.DataFrame:
    df = pd.read_csv(require("olist_customers_dataset.csv"))
    return df.rename(
        columns={
            "customer_zip_code_prefix": "zip_code_prefix",
            "customer_city": "city",
            "customer_state": "state",
        }
    )[["customer_id", "customer_unique_id", "zip_code_prefix", "city", "state"]]


def load_sellers() -> pd.DataFrame:
    df = pd.read_csv(require("olist_sellers_dataset.csv"))
    return df.rename(
        columns={
            "seller_zip_code_prefix": "zip_code_prefix",
            "seller_city": "city",
            "seller_state": "state",
        }
    )[["seller_id", "zip_code_prefix", "city", "state"]]


def load_geolocation() -> pd.DataFrame:
    # ~1M linhas no CSV bruto, várias coordenadas por prefixo de CEP —
    # agregamos pra 1 linha por prefixo (média de lat/lng, cidade/estado
    # mais frequentes) antes de carregar no MySQL.
    df = pd.read_csv(require("olist_geolocation_dataset.csv")).rename(
        columns={
            "geolocation_zip_code_prefix": "zip_code_prefix",
            "geolocation_lat": "lat",
            "geolocation_lng": "lng",
            "geolocation_city": "city",
            "geolocation_state": "state",
        }
    )
    # Algumas coordenadas do dataset caem fora do Brasil (erro de geocoding
    # upstream) — descarta antes de agregar, senão distorce a média.
    df = df[df["lat"].between(-34, 6) & df["lng"].between(-74, -32)]

    def most_common(s: pd.Series) -> str:
        return s.mode().iloc[0]

    agg = df.groupby("zip_code_prefix").agg(
        lat=("lat", "mean"),
        lng=("lng", "mean"),
        city=("city", most_common),
        state=("state", most_common),
    )
    return agg.reset_index()


def load_categories() -> pd.DataFrame:
    df = pd.read_csv(require("product_category_name_translation.csv"))
    return df.rename(
        columns={
            "product_category_name": "category_name",
            "product_category_name_english": "category_name_english",
        }
    )


def load_products(valid_categories: set[str]) -> pd.DataFrame:
    df = pd.read_csv(require("olist_products_dataset.csv"))
    df = df.rename(
        columns={
            "product_category_name": "category_name",
            "product_name_lenght": "name_length",
            "product_description_lenght": "description_length",
            "product_photos_qty": "photos_qty",
            "product_weight_g": "weight_g",
            "product_length_cm": "length_cm",
            "product_height_cm": "height_cm",
            "product_width_cm": "width_cm",
        }
    )
    # Algumas categorias no CSV de produtos não existem na tabela de tradução —
    # FK exige que sejam nulas em vez de apontar pra uma categoria inexistente.
    df.loc[~df["category_name"].isin(valid_categories), "category_name"] = None
    cols = [
        "product_id", "category_name", "name_length", "description_length",
        "photos_qty", "weight_g", "length_cm", "height_cm", "width_cm",
    ]
    return df[cols]


def load_orders(valid_customers: set[str]) -> pd.DataFrame:
    df = pd.read_csv(
        require("olist_orders_dataset.csv"),
        parse_dates=[
            "order_purchase_timestamp", "order_approved_at",
            "order_delivered_carrier_date", "order_delivered_customer_date",
            "order_estimated_delivery_date",
        ],
    )
    df = df[df["customer_id"].isin(valid_customers)]
    return df.rename(
        columns={
            "order_status": "status",
            "order_purchase_timestamp": "purchase_ts",
            "order_approved_at": "approved_ts",
            "order_delivered_carrier_date": "delivered_carrier_ts",
            "order_delivered_customer_date": "delivered_customer_ts",
            "order_estimated_delivery_date": "estimated_delivery_date",
        }
    )[[
        "order_id", "customer_id", "status", "purchase_ts", "approved_ts",
        "delivered_carrier_ts", "delivered_customer_ts", "estimated_delivery_date",
    ]]


def load_order_items(valid_orders: set[str], valid_products: set[str], valid_sellers: set[str]) -> pd.DataFrame:
    df = pd.read_csv(require("olist_order_items_dataset.csv"), parse_dates=["shipping_limit_date"])
    df = df[
        df["order_id"].isin(valid_orders)
        & df["product_id"].isin(valid_products)
        & df["seller_id"].isin(valid_sellers)
    ]
    return df.rename(
        columns={"order_item_id": "item_seq", "shipping_limit_date": "shipping_limit_ts"}
    )[["order_id", "item_seq", "product_id", "seller_id", "shipping_limit_ts", "price", "freight_value"]]


def load_payments(valid_orders: set[str]) -> pd.DataFrame:
    df = pd.read_csv(require("olist_order_payments_dataset.csv"))
    df = df[df["order_id"].isin(valid_orders)]
    return df.rename(columns={"payment_value": "value"})[
        ["order_id", "payment_sequential", "payment_type", "payment_installments", "value"]
    ].rename(columns={"payment_installments": "installments"})


def load_reviews(valid_orders: set[str]) -> pd.DataFrame:
    df = pd.read_csv(
        require("olist_order_reviews_dataset.csv"),
        parse_dates=["review_creation_date", "review_answer_timestamp"],
    )
    df = df[df["order_id"].isin(valid_orders)]
    df = df.rename(
        columns={
            "review_score": "score",
            "review_comment_title": "comment_title",
            "review_comment_message": "comment_message",
            "review_creation_date": "creation_date",
            "review_answer_timestamp": "answer_ts",
        }
    )[["review_id", "order_id", "score", "comment_title", "comment_message", "creation_date", "answer_ts"]]
    # O dataset tem alguns pares (review_id, order_id) duplicados — PK composta exige unicidade.
    return df.drop_duplicates(subset=["review_id", "order_id"])


def main():
    engine = create_engine(ENGINE_URL)

    categories = load_categories()
    customers = load_customers()
    sellers = load_sellers()
    geolocation = load_geolocation()
    products = load_products(set(categories["category_name"]))
    orders = load_orders(set(customers["customer_id"]))
    order_items = load_order_items(
        set(orders["order_id"]), set(products["product_id"]), set(sellers["seller_id"])
    )
    payments = load_payments(set(orders["order_id"]))
    reviews = load_reviews(set(orders["order_id"]))

    tables = [
        ("product_categories", categories),
        ("customers", customers),
        ("sellers", sellers),
        ("geolocation", geolocation),
        ("products", products),
        ("orders", orders),
        ("order_items", order_items),
        ("order_payments", payments),
        ("order_reviews", reviews),
    ]

    with engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        for table, _ in reversed(tables):
            conn.execute(text(f"TRUNCATE TABLE {table}"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))

    for table, df in tables:
        df.to_sql(table, engine, if_exists="append", index=False, chunksize=5000)
        print(f"{table}: {len(df)} linhas carregadas")

    print("Carga concluída.")


if __name__ == "__main__":
    main()
