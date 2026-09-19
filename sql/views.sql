USE olist_analytics;

-- Receita mensal (GMV) — soma do preço dos itens por mês da compra,
-- considerando só pedidos que não foram cancelados/indisponíveis.
CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT
    DATE_FORMAT(o.purchase_ts, '%Y-%m-01') AS month,
    ROUND(SUM(oi.price), 2)                AS revenue,
    COUNT(DISTINCT o.order_id)              AS orders
FROM orders o
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status NOT IN ('canceled', 'unavailable')
GROUP BY month;

-- Performance de entrega: só pedidos efetivamente entregues, com as duas
-- datas presentes (algumas linhas do dataset real vêm incompletas).
CREATE OR REPLACE VIEW v_delivery_performance AS
SELECT
    o.order_id,
    o.customer_id,
    DATEDIFF(o.delivered_customer_ts, o.purchase_ts) AS delivery_days,
    CASE WHEN o.delivered_customer_ts <= o.estimated_delivery_date THEN 1 ELSE 0 END AS on_time,
    r.score AS review_score
FROM orders o
LEFT JOIN order_reviews r ON r.order_id = o.order_id
WHERE o.status = 'delivered'
  AND o.delivered_customer_ts IS NOT NULL
  AND o.estimated_delivery_date IS NOT NULL;

-- Receita por categoria (em inglês, via tabela de tradução)
CREATE OR REPLACE VIEW v_category_revenue AS
SELECT
    COALESCE(pc.category_name_english, p.category_name, 'unknown') AS category,
    ROUND(SUM(oi.price), 2) AS revenue,
    COUNT(*)                AS items_sold
FROM order_items oi
JOIN products p ON p.product_id = oi.product_id
LEFT JOIN product_categories pc ON pc.category_name = p.category_name
JOIN orders o ON o.order_id = oi.order_id
WHERE o.status NOT IN ('canceled', 'unavailable')
GROUP BY category;

-- Receita por estado do cliente
CREATE OR REPLACE VIEW v_state_revenue AS
SELECT
    c.state,
    ROUND(SUM(oi.price), 2) AS revenue,
    COUNT(DISTINCT o.order_id) AS orders
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status NOT IN ('canceled', 'unavailable')
GROUP BY c.state;

-- Recompra: quantos pedidos cada cliente único (customer_unique_id) fez.
-- A Olist gera um customer_id novo por pedido — customer_unique_id é quem
-- de fato identifica a pessoa entre pedidos diferentes.
CREATE OR REPLACE VIEW v_customer_order_counts AS
SELECT
    c.customer_unique_id,
    COUNT(DISTINCT o.order_id) AS n_orders
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status NOT IN ('canceled', 'unavailable')
GROUP BY c.customer_unique_id;
