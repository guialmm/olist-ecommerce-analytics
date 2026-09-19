"""
Gera dados sintéticos realistas para o projeto SaaS Analytics.

Simula, mês a mês, o ciclo de vida de usuários de um SaaS fictício:
cadastro -> trial (14 dias) -> conversão ou expiração -> uso do produto,
pagamentos, upgrades/downgrades, churn e tickets de suporte.

O "engagement" de cada usuário é sorteado uma vez e usado para correlacionar
uso do produto com churn e tickets — de propósito, para que a análise
(ex: "baixo uso prediz cancelamento?") tenha um sinal real pra encontrar.

Saída: CSVs em ../data/, prontos para o ETL carregar no MySQL.
"""

import random
import uuid
from pathlib import Path

import numpy as np
import pandas as pd
from faker import Faker

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
Faker.seed(SEED)
fake = Faker()

OUT_DIR = Path(__file__).resolve().parent.parent / "data"
OUT_DIR.mkdir(exist_ok=True)

SIM_START = pd.Timestamp("2023-01-01")
N_MONTHS = 24
SIM_END = SIM_START + pd.DateOffset(months=N_MONTHS)

PLANS = {1: ("Starter", 1, 29.00), 2: ("Pro", 2, 79.00), 3: ("Business", 3, 199.00)}
PLAN_PRICE = {pid: p[2] for pid, p in PLANS.items()}
PLAN_TIER = {pid: p[1] for pid, p in PLANS.items()}

SEGMENTS = ["Startup", "SMB", "Enterprise"]
SEGMENT_WEIGHTS = [0.50, 0.35, 0.15]
SEGMENT_PLAN_PREF = {
    "Startup": [0.70, 0.25, 0.05],
    "SMB": [0.30, 0.50, 0.20],
    "Enterprise": [0.05, 0.35, 0.60],
}
SEGMENT_CONVERSION = {"Startup": 0.55, "SMB": 0.65, "Enterprise": 0.75}
SEGMENT_ENGAGEMENT_BETA = {  # (alpha, beta) -> quanto maior alpha vs beta, maior engagement médio
    "Startup": (2, 3),
    "SMB": (3, 3),
    "Enterprise": (4, 2),
}

COUNTRIES = [
    "Brazil", "United States", "Portugal", "United Kingdom", "Germany",
    "Canada", "Mexico", "Argentina", "Spain", "India",
]

FEATURES = [
    "dashboard", "reports", "api_integration", "team_management",
    "automation", "billing_settings", "export_data", "notifications",
    "search", "collaboration",
]

TICKET_CATEGORIES = ["bug", "billing", "feature_request", "onboarding", "other"]


def base_hazard(tenure_month: int) -> float:
    if tenure_month <= 3:
        return 0.10
    if tenure_month <= 6:
        return 0.06
    if tenure_month <= 12:
        return 0.035
    return 0.02


def tier_factor(plan_id: int) -> float:
    return {1: 1.3, 2: 1.0, 3: 0.6}[plan_id]


def engagement_factor(e: float) -> float:
    return 1.6 - 1.2 * e


def seasonal_factor(month_idx: int) -> float:
    month = (SIM_START.month - 1 + month_idx) % 12 + 1
    if month == 12:
        return 0.7
    if month in (1, 9):
        return 1.15
    return 1.0


def random_date_in_window(start: pd.Timestamp, end: pd.Timestamp) -> pd.Timestamp:
    end = min(end, SIM_END - pd.Timedelta(days=1))
    if end <= start:
        return start
    delta_days = (end - start).days
    return start + pd.Timedelta(days=random.randint(0, delta_days))


def gen_usage_and_tickets(user_id, window_start, window_end, engagement, is_trial, rows_usage, rows_tickets, ticket_id_gen):
    span_days = max((window_end - window_start).days, 1)
    scale = span_days / 30.0
    lam = (1 + 6 * engagement) if is_trial else (2 + 10 * engagement)
    n_sessions = np.random.poisson(lam * scale)

    for _ in range(n_sessions):
        session_id = f"s-{uuid.uuid4().hex[:10]}"
        n_events = random.randint(1, 4)
        for _ in range(n_events):
            rows_usage.append({
                "id": None,  # preenchido no final
                "user_id": user_id,
                "feature": random.choice(FEATURES),
                "event_date": random_date_in_window(window_start, window_end).date(),
                "session_id": session_id,
            })

    ticket_prob = (0.08 if is_trial else 0.03 + 0.12 * (1 - engagement)) * scale
    if random.random() < ticket_prob:
        rows_tickets.append({
            "id": next(ticket_id_gen),
            "user_id": user_id,
            "created_date": random_date_in_window(window_start, window_end).date(),
            "category": random.choice(TICKET_CATEGORIES),
            "resolved": random.random() < 0.8,
        })


def id_generator(start=1):
    i = start
    while True:
        yield i
        i += 1


def main():
    users, subscriptions, sub_events, payments = [], [], [], []
    usage_rows, ticket_rows = [], []

    user_ids = id_generator()
    sub_ids = id_generator()
    event_ids = id_generator()
    payment_ids = id_generator()
    ticket_ids = id_generator()

    signup_base = 40
    growth_rate = 1.045

    for month_idx in range(N_MONTHS):
        month_start = SIM_START + pd.DateOffset(months=month_idx)
        month_end = month_start + pd.DateOffset(months=1)
        n_signups = int(np.random.poisson(signup_base * (growth_rate ** month_idx) * seasonal_factor(month_idx)))

        for _ in range(n_signups):
            uid = next(user_ids)
            segment = np.random.choice(SEGMENTS, p=SEGMENT_WEIGHTS)
            engagement = float(np.random.beta(*SEGMENT_ENGAGEMENT_BETA[segment]))
            signup_date = random_date_in_window(month_start, month_end)
            plan_id = int(np.random.choice([1, 2, 3], p=SEGMENT_PLAN_PREF[segment]))

            users.append({
                "id": uid,
                "name": fake.name(),
                "email": fake.unique.email(),
                "company": fake.company(),
                "segment": segment,
                "country": random.choice(COUNTRIES),
                "signup_date": signup_date.date(),
            })

            sid = next(sub_ids)
            trial_end = signup_date + pd.Timedelta(days=14)
            sub_events.append({
                "id": next(event_ids), "subscription_id": sid, "event_type": "trial_start",
                "event_date": signup_date.date(), "from_plan_id": None, "to_plan_id": plan_id,
            })

            gen_usage_and_tickets(uid, signup_date, min(trial_end, SIM_END), engagement, True,
                                   usage_rows, ticket_rows, ticket_ids)

            converts = random.random() < SEGMENT_CONVERSION[segment]

            if not converts or trial_end >= SIM_END:
                subscriptions.append({
                    "id": sid, "user_id": uid, "plan_id": plan_id,
                    "start_date": signup_date.date(),
                    "end_date": min(trial_end, SIM_END).date(),
                    "status": "expired" if not converts else "trial",
                })
                if not converts:
                    sub_events.append({
                        "id": next(event_ids), "subscription_id": sid, "event_type": "expired",
                        "event_date": trial_end.date(), "from_plan_id": plan_id, "to_plan_id": None,
                    })
                continue

            sub_events.append({
                "id": next(event_ids), "subscription_id": sid, "event_type": "converted",
                "event_date": trial_end.date(), "from_plan_id": None, "to_plan_id": plan_id,
            })

            current_plan_id = plan_id
            cursor = trial_end
            tenure_month = 0
            status = "active"
            end_date = None

            while cursor < SIM_END:
                tenure_month += 1
                next_cursor = min(cursor + pd.DateOffset(months=1), SIM_END)

                payments.append({
                    "id": next(payment_ids), "subscription_id": sid,
                    "amount": PLAN_PRICE[current_plan_id],
                    "payment_date": cursor.date(),
                    "status": "paid" if random.random() > 0.05 else "failed",
                })

                gen_usage_and_tickets(uid, cursor, next_cursor, engagement, False,
                                       usage_rows, ticket_rows, ticket_ids)

                hazard = base_hazard(tenure_month) * tier_factor(current_plan_id) * engagement_factor(engagement)
                will_churn = random.random() < hazard

                if will_churn:
                    status = "canceled"
                    end_date = random_date_in_window(cursor, next_cursor)
                    sub_events.append({
                        "id": next(event_ids), "subscription_id": sid, "event_type": "canceled",
                        "event_date": end_date.date(), "from_plan_id": current_plan_id, "to_plan_id": None,
                    })
                    break

                r = random.random()
                upgrade_prob = 0.015 + 0.02 * engagement
                downgrade_prob = 0.02 * (1 - engagement)
                tier = PLAN_TIER[current_plan_id]
                if r < upgrade_prob and tier < 3:
                    new_plan_id = current_plan_id + 1
                    sub_events.append({
                        "id": next(event_ids), "subscription_id": sid, "event_type": "upgrade",
                        "event_date": next_cursor.date(), "from_plan_id": current_plan_id, "to_plan_id": new_plan_id,
                    })
                    current_plan_id = new_plan_id
                elif r < upgrade_prob + downgrade_prob and tier > 1:
                    new_plan_id = current_plan_id - 1
                    sub_events.append({
                        "id": next(event_ids), "subscription_id": sid, "event_type": "downgrade",
                        "event_date": next_cursor.date(), "from_plan_id": current_plan_id, "to_plan_id": new_plan_id,
                    })
                    current_plan_id = new_plan_id

                cursor = next_cursor

            subscriptions.append({
                "id": sid, "user_id": uid, "plan_id": current_plan_id,
                "start_date": trial_end.date(),
                "end_date": end_date.date() if end_date is not None else None,
                "status": status,
            })

    for i, row in enumerate(usage_rows, start=1):
        row["id"] = i

    pd.DataFrame(users).to_csv(OUT_DIR / "users.csv", index=False)
    pd.DataFrame(subscriptions).to_csv(OUT_DIR / "subscriptions.csv", index=False)
    pd.DataFrame(sub_events).to_csv(OUT_DIR / "subscription_events.csv", index=False)
    pd.DataFrame(payments).to_csv(OUT_DIR / "payments.csv", index=False)
    pd.DataFrame(usage_rows).to_csv(OUT_DIR / "usage_events.csv", index=False)
    pd.DataFrame(ticket_rows).to_csv(OUT_DIR / "support_tickets.csv", index=False)

    print(f"users: {len(users)}")
    print(f"subscriptions: {len(subscriptions)}")
    print(f"subscription_events: {len(sub_events)}")
    print(f"payments: {len(payments)}")
    print(f"usage_events: {len(usage_rows)}")
    print(f"support_tickets: {len(ticket_rows)}")
    print(f"CSVs escritos em: {OUT_DIR}")


if __name__ == "__main__":
    main()
