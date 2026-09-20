-- Olist E-Commerce Analytics — schema
-- Modelo relacional próprio em cima do dataset público real da Olist
-- (github.com/guialmm/olist-ecommerce-analytics). Nomes de coluna e tipos
-- foram normalizados a partir dos CSVs originais — ver etl/load_to_mysql.py.

CREATE DATABASE IF NOT EXISTS olist_analytics
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE olist_analytics;

DROP TABLE IF EXISTS order_reviews;
DROP TABLE IF EXISTS order_payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_categories;
DROP TABLE IF EXISTS sellers;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS geolocation;

CREATE TABLE customers (
    customer_id         VARCHAR(32) PRIMARY KEY,
    customer_unique_id  VARCHAR(32) NOT NULL,
    zip_code_prefix     VARCHAR(10) NOT NULL,
    city                VARCHAR(100) NOT NULL,
    state               CHAR(2) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE sellers (
    seller_id           VARCHAR(32) PRIMARY KEY,
    zip_code_prefix     VARCHAR(10) NOT NULL,
    city                VARCHAR(100) NOT NULL,
    state               CHAR(2) NOT NULL
) ENGINE=InnoDB;

-- Uma linha por prefixo de CEP (lat/lng médios) — o CSV bruto da Olist tem
-- ~1M linhas (várias coordenadas por CEP); agregamos no ETL pra manter só
-- o que é de fato útil pro heatmap (~19 mil prefixos únicos).
CREATE TABLE geolocation (
    zip_code_prefix     VARCHAR(10) PRIMARY KEY,
    lat                 DECIMAL(9,6) NOT NULL,
    lng                 DECIMAL(9,6) NOT NULL,
    city                VARCHAR(100) NOT NULL,
    state               CHAR(2) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE product_categories (
    category_name          VARCHAR(60) PRIMARY KEY,
    category_name_english  VARCHAR(60) NULL
) ENGINE=InnoDB;

CREATE TABLE products (
    product_id              VARCHAR(32) PRIMARY KEY,
    category_name           VARCHAR(60) NULL,
    name_length             INT NULL,
    description_length      INT NULL,
    photos_qty              INT NULL,
    weight_g                INT NULL,
    length_cm               INT NULL,
    height_cm               INT NULL,
    width_cm                INT NULL,
    FOREIGN KEY (category_name) REFERENCES product_categories(category_name)
) ENGINE=InnoDB;

CREATE TABLE orders (
    order_id                 VARCHAR(32) PRIMARY KEY,
    customer_id              VARCHAR(32) NOT NULL,
    status                   VARCHAR(20) NOT NULL,
    purchase_ts              DATETIME NOT NULL,
    approved_ts              DATETIME NULL,
    delivered_carrier_ts     DATETIME NULL,
    delivered_customer_ts    DATETIME NULL,
    estimated_delivery_date  DATE NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id            VARCHAR(32) NOT NULL,
    item_seq            SMALLINT NOT NULL,
    product_id          VARCHAR(32) NOT NULL,
    seller_id           VARCHAR(32) NOT NULL,
    shipping_limit_ts   DATETIME NOT NULL,
    price               DECIMAL(10,2) NOT NULL,
    freight_value       DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (seller_id) REFERENCES sellers(seller_id)
) ENGINE=InnoDB;

CREATE TABLE order_payments (
    id                    BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id              VARCHAR(32) NOT NULL,
    payment_sequential    SMALLINT NOT NULL,
    payment_type          VARCHAR(20) NOT NULL,
    installments          SMALLINT NOT NULL,
    value                 DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
) ENGINE=InnoDB;

CREATE TABLE order_reviews (
    review_id           VARCHAR(32) NOT NULL,
    order_id             VARCHAR(32) NOT NULL,
    score                TINYINT NOT NULL,
    comment_title        VARCHAR(255) NULL,
    comment_message      TEXT NULL,
    creation_date        DATETIME NOT NULL,
    answer_ts            DATETIME NULL,
    PRIMARY KEY (review_id, order_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
) ENGINE=InnoDB;

CREATE INDEX idx_customers_unique ON customers(customer_unique_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_purchase_ts ON orders(purchase_ts);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_items_order ON order_items(order_id);
CREATE INDEX idx_items_product ON order_items(product_id);
CREATE INDEX idx_payments_order ON order_payments(order_id);
CREATE INDEX idx_reviews_order ON order_reviews(order_id);
