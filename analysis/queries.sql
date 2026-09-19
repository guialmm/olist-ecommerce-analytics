-- ============================================================
-- Queries de análise de negócio — material de estudo/casing.
-- Rode sql/views.sql antes de usar este arquivo.
-- ============================================================
USE saas_analytics;

-- 1) MRR mês a mês
SELECT * FROM v_mrr_by_month ORDER BY active_month;

-- 2) Churn rate mensal
-- churn_rate = cancelamentos no mês / assinaturas ativas no início do mês
SELECT
    DATE_FORMAT(se.event_date, '%Y-%m-01') AS month,
    COUNT(*) AS cancellations
FROM subscription_events se
WHERE se.event_type = 'canceled'
GROUP BY month
ORDER BY month;

-- 3) Cohort retention: % de usuários de cada cohort de cadastro ainda ativos N meses depois
SELECT
    cohort_month,
    PERIOD_DIFF(DATE_FORMAT(active_month, '%Y%m'), DATE_FORMAT(cohort_month, '%Y%m')) AS months_since_signup,
    COUNT(DISTINCT user_id) AS active_users
FROM v_subscription_months
GROUP BY cohort_month, months_since_signup
ORDER BY cohort_month, months_since_signup;

-- 4) Funil trial -> pago
SELECT
    status,
    COUNT(*) AS n_subscriptions
FROM subscriptions
GROUP BY status;

-- 5) LTV médio por segmento (soma de pagamentos "paid" por usuário, depois média por segmento)
SELECT
    u.segment,
    ROUND(AVG(user_total.total_paid), 2) AS avg_ltv
FROM (
    SELECT s.user_id, SUM(pay.amount) AS total_paid
    FROM payments pay
    JOIN subscriptions s ON s.id = pay.subscription_id
    WHERE pay.status = 'paid'
    GROUP BY s.user_id
) user_total
JOIN users u ON u.id = user_total.user_id
GROUP BY u.segment
ORDER BY avg_ltv DESC;

-- 6) Engajamento (sessões médias/mês) comparando quem cancelou vs. quem não cancelou
-- Só considera quem converteu de fato (active/canceled) — incluir trial/expired aqui
-- distorceria "retained" pra baixo, já que quem nem virou cliente mal usou o produto.
SELECT
    CASE WHEN s.status = 'canceled' THEN 'canceled' ELSE 'retained' END AS group_status,
    ROUND(AVG(uu.sessions), 2) AS avg_monthly_sessions
FROM subscriptions s
JOIN v_user_monthly_usage uu ON uu.user_id = s.user_id
WHERE s.status IN ('active', 'canceled')
GROUP BY group_status;

-- 7) Distribuição de planos por segmento (receita)
SELECT
    u.segment,
    p.name AS plan,
    COUNT(*) AS n_subscriptions,
    ROUND(SUM(p.monthly_price), 2) AS mrr_contribution
FROM subscriptions s
JOIN users u ON u.id = s.user_id
JOIN plans p ON p.id = s.plan_id
WHERE s.status = 'active'
GROUP BY u.segment, p.name
ORDER BY u.segment, mrr_contribution DESC;

-- 8) Tickets de suporte não resolvidos vs. churn
SELECT
    CASE WHEN s.status = 'canceled' THEN 'canceled' ELSE 'retained' END AS group_status,
    ROUND(AVG(t.open_tickets), 2) AS avg_open_tickets
FROM subscriptions s
JOIN (
    SELECT user_id, SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) AS open_tickets
    FROM support_tickets
    GROUP BY user_id
) t ON t.user_id = s.user_id
WHERE s.status IN ('active', 'canceled')
GROUP BY group_status;

-- 9) Upgrades vs downgrades ao longo do tempo
SELECT
    DATE_FORMAT(event_date, '%Y-%m-01') AS month,
    event_type,
    COUNT(*) AS n
FROM subscription_events
WHERE event_type IN ('upgrade', 'downgrade')
GROUP BY month, event_type
ORDER BY month;
