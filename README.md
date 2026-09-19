# SaaS Analytics

Projeto de portfólio/estudo: banco de dados relacional próprio (MySQL) simulando
uma empresa SaaS fictícia com assinaturas, uso de produto e churn, mais um
dashboard interativo em Streamlit para responder perguntas de negócio.

## Contexto

Você é o analista de dados de um SaaS B2B (planos Starter/Pro/Business) e
precisa entender a saúde do negócio: crescimento de MRR, churn, retenção por
cohort, LTV por segmento de cliente, e se o uso do produto prediz cancelamento.

Os dados são **sintéticos, mas gerados com padrões realistas de propósito**:
churn mais alto nos primeiros meses, maior entre planos baratos, e
correlacionado com baixo engajamento — para que a análise tenha sinal de
verdade para encontrar, como em um SaaS real.

## Schema

- `plans` — planos disponíveis (Starter/Pro/Business)
- `users` — usuários cadastrados (segmento, país, data de cadastro)
- `subscriptions` — assinatura de cada usuário (trial/active/canceled/expired)
- `subscription_events` — trilha de eventos (trial_start, converted, upgrade, downgrade, canceled)
- `payments` — cobranças mensais
- `usage_events` — eventos de uso do produto (feature, sessão)
- `support_tickets` — tickets de suporte

## Stack

- **MySQL 8** (Docker)
- **Python** (Faker, pandas, numpy) para geração de dados sintéticos
- **SQLAlchemy / PyMySQL** para ETL
- **Streamlit + Plotly** para o dashboard

## Setup

```bash
# 1. Subir o MySQL (cria o schema automaticamente na primeira vez)
cp .env.example .env
docker compose up -d

# 2. Ambiente Python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Gerar dados sintéticos (grava CSVs em data/)
python data_generation/generate_data.py

# 4. Carregar no MySQL
python etl/load_to_mysql.py

# 5. Criar as views de análise
mysql -h 127.0.0.1 -u saas_user -p saas_analytics < sql/views.sql
# (senha em .env, MYSQL_PASSWORD)

# 6. Rodar o dashboard
streamlit run dashboard/app.py
```

## Explorando com SQL puro

`analysis/queries.sql` tem uma bateria de queries prontas — boas para praticar
para entrevistas (casing):

1. MRR mês a mês
2. Churn rate mensal
3. Cohort retention (% retido por mês desde o cadastro)
4. Funil trial → pago
5. LTV médio por segmento
6. Engajamento: retidos vs. cancelados
7. Receita por segmento/plano
8. Tickets não resolvidos vs. churn
9. Upgrades vs. downgrades ao longo do tempo

## Próximos passos possíveis

- Adicionar um modelo simples de previsão de churn (scikit-learn) usando
  `v_user_monthly_usage` + tickets como features
- Deploy do dashboard no Streamlit Community Cloud + banco gerenciado
  (Railway/PlanetScale free tier) para link público no portfólio
- Diagrama ER exportado (dbdiagram.io ou similar) para o README
