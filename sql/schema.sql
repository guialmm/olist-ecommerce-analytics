-- SaaS Analytics — schema
-- Convenção: todas as tabelas em InnoDB/utf8mb4, PKs auto_increment, FKs explícitas.

CREATE DATABASE IF NOT EXISTS saas_analytics
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE saas_analytics;

DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS usage_events;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS subscription_events;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS plans;

CREATE TABLE plans (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(50)     NOT NULL,
    tier            TINYINT         NOT NULL,      -- 1=Starter, 2=Pro, 3=Business
    monthly_price   DECIMAL(10,2)   NOT NULL
) ENGINE=InnoDB;

CREATE TABLE users (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(120)    NOT NULL,
    email           VARCHAR(150)    NOT NULL UNIQUE,
    company         VARCHAR(150)    NOT NULL,
    segment         ENUM('Startup','SMB','Enterprise') NOT NULL,
    country         VARCHAR(60)     NOT NULL,
    signup_date     DATE            NOT NULL
) ENGINE=InnoDB;

CREATE TABLE subscriptions (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT             NOT NULL,
    plan_id         INT             NOT NULL,
    start_date      DATE            NOT NULL,
    end_date        DATE            NULL,
    status          ENUM('trial','active','canceled','expired') NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
) ENGINE=InnoDB;

CREATE TABLE subscription_events (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    subscription_id INT             NOT NULL,
    event_type      ENUM('trial_start','converted','upgrade','downgrade','canceled','expired') NOT NULL,
    event_date      DATE            NOT NULL,
    from_plan_id    INT             NULL,
    to_plan_id      INT             NULL,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
    FOREIGN KEY (from_plan_id) REFERENCES plans(id),
    FOREIGN KEY (to_plan_id) REFERENCES plans(id)
) ENGINE=InnoDB;

CREATE TABLE payments (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    subscription_id INT             NOT NULL,
    amount          DECIMAL(10,2)   NOT NULL,
    payment_date    DATE            NOT NULL,
    status          ENUM('paid','failed') NOT NULL,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
) ENGINE=InnoDB;

CREATE TABLE usage_events (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT             NOT NULL,
    feature         VARCHAR(60)     NOT NULL,
    event_date      DATE            NOT NULL,
    session_id      VARCHAR(40)     NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE support_tickets (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT             NOT NULL,
    created_date    DATE            NOT NULL,
    category        ENUM('bug','billing','feature_request','onboarding','other') NOT NULL,
    resolved        BOOLEAN         NOT NULL DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_usage_user_date ON usage_events(user_id, event_date);
CREATE INDEX idx_tickets_user ON support_tickets(user_id);

INSERT INTO plans (name, tier, monthly_price) VALUES
    ('Starter', 1, 29.00),
    ('Pro', 2, 79.00),
    ('Business', 3, 199.00);
