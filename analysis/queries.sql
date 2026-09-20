-- ============================================================
-- Queries de análise de negócio — material de estudo/casing.
-- Dataset real da Olist. Rode sql/views.sql antes de usar este arquivo.
-- ============================================================
USE olist_analytics;

-- 1) Receita (GMV) mês a mês
SELECT * FROM v_monthly_revenue ORDER BY month;

-- 2) Funil de status dos pedidos
SELECT status, COUNT(*) AS n_orders, ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct
FROM orders
GROUP BY status
ORDER BY n_orders DESC;

-- 3) Performance de entrega: % no prazo e tempo médio
SELECT
    ROUND(AVG(on_time) * 100, 1) AS pct_on_time,
    ROUND(AVG(delivery_days), 1) AS avg_delivery_days
FROM v_delivery_performance;

-- 4) Nota média da avaliação: entregas no prazo vs. atrasadas
-- (a pergunta de negócio: atraso na entrega derruba a satisfação do cliente?)
SELECT
    CASE WHEN on_time = 1 THEN 'no prazo' ELSE 'atrasado' END AS entrega,
    ROUND(AVG(review_score), 2) AS nota_media,
    COUNT(*) AS n_pedidos
FROM v_delivery_performance
WHERE review_score IS NOT NULL
GROUP BY entrega;

-- 5) Top 10 categorias por receita
SELECT * FROM v_category_revenue ORDER BY revenue DESC LIMIT 10;

-- 6) Receita por estado
SELECT * FROM v_state_revenue ORDER BY revenue DESC;

-- 7) Taxa de recompra (clientes com mais de 1 pedido)
SELECT
    SUM(CASE WHEN n_orders = 1 THEN 1 ELSE 0 END)                                AS clientes_1_pedido,
    SUM(CASE WHEN n_orders > 1 THEN 1 ELSE 0 END)                                AS clientes_recorrentes,
    ROUND(SUM(CASE WHEN n_orders > 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2)   AS pct_recompra
FROM v_customer_order_counts;

-- 8) Distribuição de método de pagamento
SELECT
    payment_type,
    COUNT(*) AS n_pagamentos,
    ROUND(AVG(installments), 1) AS parcelas_media,
    ROUND(SUM(value), 2) AS valor_total
FROM order_payments
GROUP BY payment_type
ORDER BY valor_total DESC;

-- 9) Distribuição de notas de avaliação (1 a 5)
SELECT score, COUNT(*) AS n_reviews
FROM order_reviews
GROUP BY score
ORDER BY score;

-- 10) Ticket médio por pedido
SELECT ROUND(AVG(order_total), 2) AS avg_order_value
FROM (
    SELECT order_id, SUM(price) AS order_total
    FROM order_items
    GROUP BY order_id
) t;

-- 11) Densidade geográfica de pedidos (top 10 prefixos de CEP por receita)
SELECT zip_code_prefix, city, state, revenue, orders
FROM v_geo_density
ORDER BY revenue DESC
LIMIT 10;
