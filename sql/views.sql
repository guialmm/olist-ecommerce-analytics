USE saas_analytics;

-- Uma linha por (assinatura, mês) em que ela esteve ativa e pagando.
-- Base para MRR, churn mensal e cohort retention.
CREATE OR REPLACE VIEW v_subscription_months AS
SELECT
    s.id                AS subscription_id,
    s.user_id,
    u.segment,
    DATE_FORMAT(s.start_date, '%Y-%m-01')                              AS cohort_month,
    DATE_FORMAT(m.month_date, '%Y-%m-01')                              AS active_month,
    p.id                AS plan_id,
    p.name              AS plan_name,
    p.monthly_price
FROM subscriptions s
JOIN users u ON u.id = s.user_id
JOIN plans p ON p.id = s.plan_id
JOIN (
    -- gera uma linha por mês entre 2023-01 e 2024-12 (24 meses da simulação)
    SELECT DATE_ADD('2023-01-01', INTERVAL n MONTH) AS month_date
    FROM (
        SELECT a.n + b.n * 10 AS n
        FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
              UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a
        CROSS JOIN (SELECT 0 n UNION SELECT 1 UNION SELECT 2) b
    ) seq
    WHERE seq.n < 24
) m ON m.month_date >= DATE_FORMAT(s.start_date, '%Y-%m-01')
   AND m.month_date < COALESCE(s.end_date, '2099-01-01')
WHERE s.status IN ('active', 'canceled');

-- MRR por mês
CREATE OR REPLACE VIEW v_mrr_by_month AS
SELECT active_month, ROUND(SUM(monthly_price), 2) AS mrr, COUNT(*) AS active_subscriptions
FROM v_subscription_months
GROUP BY active_month;

-- Engagement mensal por usuário (nº de sessões distintas e eventos)
CREATE OR REPLACE VIEW v_user_monthly_usage AS
SELECT
    user_id,
    DATE_FORMAT(event_date, '%Y-%m-01') AS usage_month,
    COUNT(DISTINCT session_id)          AS sessions,
    COUNT(*)                            AS events
FROM usage_events
GROUP BY user_id, DATE_FORMAT(event_date, '%Y-%m-01');
