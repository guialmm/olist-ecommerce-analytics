# Olist E-Commerce Analytics

[![CI](https://github.com/guialmm/olist-ecommerce-analytics/actions/workflows/ci.yml/badge.svg)](https://github.com/guialmm/olist-ecommerce-analytics/actions/workflows/ci.yml)

**[Demo ao vivo](https://olist-ecommerce-analytics-nine.vercel.app)** — login:
`demo` / `olist2018` (backend grátis pode levar ~30s pra acordar na primeira
visita, ver [Deploy](#deploy))

Dashboard de analytics sobre dados **reais** de e-commerce brasileiro (o
[Brazilian E-Commerce Public Dataset by Olist](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce),
~100 mil pedidos entre 2016 e 2018): banco relacional próprio (MySQL), API
(FastAPI) e um dashboard interativo (React + TypeScript + Tailwind + Framer
Motion + Recharts) com filtros sincronizados por URL, cross-filtering entre
gráficos, exportação em CSV e um modelo de ML simulando risco de avaliação
negativa.

## Contexto

Você é o analista de dados de um marketplace e precisa entender a saúde do
negócio: evolução da receita, funil de status dos pedidos, performance de
entrega, categorias mais fortes, receita por estado e métodos de pagamento.

Achado real mais forte do dataset: **pedidos entregues com atraso têm 46% de
notas 1 estrela**, contra **62% de notas 5 estrelas nos entregues no prazo**
— prazo de entrega é o maior driver de satisfação nesse negócio.

Outro achado real: ~95% dos clientes (`customer_unique_id`) fazem só **um**
pedido no período — recompra é raríssima, o que muda completamente que tipo
de estratégia (aquisição vs. retenção) faz sentido pra esse negócio.

## Schema

- `customers` — um registro por pedido (`customer_id`); `customer_unique_id`
  identifica a pessoa de fato entre pedidos diferentes
- `sellers` — vendedores do marketplace
- `geolocation` — 1 linha por prefixo de CEP (lat/lng médios), agregada no
  ETL a partir das ~1M linhas brutas do dataset — base do mapa de calor
- `product_categories` — tradução pt → en das categorias
- `products` — catálogo (categoria, dimensões, peso)
- `orders` — pedidos (status, timestamps de compra/aprovação/entrega)
- `order_items` — itens de cada pedido (preço, frete, vendedor)
- `order_payments` — pagamentos (tipo, parcelas, valor)
- `order_reviews` — avaliações (nota 1-5, comentário)

## Stack

- **MySQL 8** (Docker)
- **Python** (pandas, SQLAlchemy, PyMySQL) para o ETL
- **scikit-learn** — modelo de risco de avaliação negativa (treino offline, ver `ml/`)
- **FastAPI** — API REST que serve o dashboard, protegida por login (JWT)
- **React + TypeScript + Tailwind + Framer Motion + Recharts + Leaflet** — frontend animado

## Login

Todo o dashboard fica atrás de autenticação. Não existe cadastro — é um
usuário único de demonstração, com credenciais em `.env`:

```
usuário: demo
senha:   olist2018
```

`POST /api/auth/login` devolve um JWT (12h de validade); todo endpoint de
análise exige esse token. Ver [backend/auth.py](backend/auth.py).

## Setup

### Opção 1 — stack inteiro via Docker (mais simples)

```bash
cp .env.example .env

# baixar o dataset real (precisa de conta + API key no Kaggle)
pip install kaggle
kaggle datasets download -d olistbr/brazilian-ecommerce -p data/raw --unzip

docker compose up -d --build
```

Isso sobe MySQL (schema + views criados automaticamente), API e frontend —
falta só carregar os dados:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python etl/load_to_mysql.py
```

Abre em `http://localhost:5173` (login: `demo` / `olist2018`).

### Opção 2 — rodando local (melhor pra desenvolver, com hot reload)

```bash
# 1. Subir só o MySQL
cp .env.example .env
docker compose up -d mysql

# 2. Ambiente Python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r backend/requirements.txt

# 3. Baixar o dataset real (precisa de conta + API key no Kaggle)
pip install kaggle
kaggle datasets download -d olistbr/brazilian-ecommerce -p data/raw --unzip

# 4. Carregar no MySQL
python etl/load_to_mysql.py

# 5. Subir a API
cd backend && uvicorn main:app --reload --port 8000
# em outro terminal:

# 6. Subir o frontend
cd frontend
cp .env.example .env
npm install
npm run dev
# abre em http://localhost:5173 (API em http://localhost:8000)
```

## Deploy

Demo pública: **[olist-ecommerce-analytics-nine.vercel.app](https://olist-ecommerce-analytics-nine.vercel.app)**

Três serviços, todos com camada gratuita permanente:

| Camada | Serviço | Por quê |
|---|---|---|
| Frontend (estático) | [Vercel](https://vercel.com) | grátis pra sempre, sem cold start |
| Backend (API) | [Render](https://render.com) | grátis pra sempre, mas **dorme após ~15min sem uso** (primeira visita depois disso demora uns 30-50s pra acordar, depois fica normal) |
| Banco (MySQL) | [Aiven](https://aiven.io) | dos poucos com MySQL gratuito permanente e sem cartão de crédito |

Passo a passo:

### 1. Banco — Aiven MySQL

1. Crie uma conta em [aiven.io](https://aiven.io) (sem cartão) e um serviço **MySQL** no plano **Free**.
2. Na página do serviço, pegue em "Connection information": `Host`, `Port`, `User`, `Password`, `Database name` (normalmente `defaultdb`), e baixe o certificado **CA Certificate** (`ca.pem`).
3. Aplique o schema e carregue os dados a partir da sua máquina (com o dataset já em `data/raw/`, ver [data/README.md](data/README.md)):
   ```bash
   mysql -h<host> -P<port> -u<user> -p --ssl-ca=<caminho/ca.pem> <database> < sql/schema.sql
   mysql -h<host> -P<port> -u<user> -p --ssl-ca=<caminho/ca.pem> <database> < sql/views.sql

   MYSQL_HOST=<host> MYSQL_PORT=<port> MYSQL_USER=<user> MYSQL_PASSWORD=<senha> \
   MYSQL_DATABASE=<database> MYSQL_SSL_CA=<caminho/ca.pem> \
   python etl/load_to_mysql.py
   ```

### 2. Backend — Render

1. Crie uma conta em [render.com](https://render.com) e conecte o GitHub.
2. **New > Blueprint**, aponte pro repositório — o [render.yaml](render.yaml) já define o serviço (Docker, plano free, health check em `/api/health`).
3. Preenche as variáveis de ambiente marcadas como manuais: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` (dados da Aiven) e `DEMO_PASSWORD`. `JWT_SECRET_KEY` é gerado automaticamente.
4. Pro certificado TLS da Aiven: em **Environment > Secret Files**, adicione um arquivo (ex: caminho `/etc/secrets/aiven-ca.pem`) colando o conteúdo do `ca.pem`; defina `MYSQL_SSL_CA=/etc/secrets/aiven-ca.pem` na variável de ambiente.
5. Deixe `CORS_ORIGINS` em branco por enquanto — volta nesse passo depois do frontend estar no ar (passo 3.3).
6. Guarda a URL que o Render gerou (`https://olist-analytics-api.onrender.com` ou parecido).

### 3. Frontend — Vercel

1. Crie uma conta em [vercel.com](https://vercel.com), **Add New > Project**, importe o repositório.
2. Em **Root Directory**, aponte pra `frontend` (o projeto é um monorepo).
3. Em **Environment Variables**, adicione `VITE_API_URL` com a URL do backend do Render (passo 2.6).
4. Deploy. Guarda a URL que a Vercel gerou.
5. Volta no Render e preenche `CORS_ORIGINS` com essa URL da Vercel — sem isso o navegador bloqueia as chamadas à API por CORS.

### Custo e limitações

- Tudo isso é R$ 0/mês nos três serviços, sem cartão de crédito.
- O backend no Render dorme após ~15min sem tráfego — a primeira requisição depois disso demora pra acordar. Pra portfólio isso é um trade-off aceitável; pra manter sempre ligado, o plano pago do Render (~US$7/mês) ou Railway resolvem.
- O modelo de risco de avaliação (`backend/review_risk_model.json`) já vem versionado no repo — não precisa rodar `ml/train_review_risk_model.py` em produção.

## CI

O [workflow](.github/workflows/ci.yml) roda em todo push/PR: lint + type-check
+ build + testes do frontend, e testes do backend contra um MySQL de serviço
(schema + views aplicados automaticamente).

Por padrão os testes que fazem asserções sobre o dataset real (`test_api.py`)
**pulam** no CI, porque o dado não vem versionado no repo (ver
[Licença dos dados](#licença-dos-dados)). Pra rodar a suíte completa no CI
também, configure 2 secrets no repositório do GitHub — Settings → Secrets and
variables → Actions → New repository secret:

| Secret | Valor |
|---|---|
| `KAGGLE_USERNAME` | seu usuário do Kaggle |
| `KAGGLE_KEY` | sua API key (kaggle.com/settings → Create New Token) |

Com isso configurado, o CI baixa o dataset e carrega no MySQL antes de rodar
os testes — sem isso, nada quebra, só pula os testes que precisam do dado.

## Testes

Backend (pytest — 59 testes: unitários nas funções puras de `analytics.py`,
autenticação e integração da API contra o MySQL real; pula com uma mensagem
clara se o banco não estiver de pé):

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

Frontend (Vitest + Testing Library — 85 testes: funções de formatação,
`lib/api.ts`, `lib/auth.ts`, componentes, o gate de autenticação e o fluxo
completo do `Dashboard` com a API mockada):

```bash
cd frontend
npm test          # roda uma vez
npm run test:watch  # modo watch
```

## Modelo de risco de avaliação negativa

Regressão logística simples (scikit-learn) treinada em `delivery_days` +
`on_time` prevendo a probabilidade de uma avaliação ser negativa (nota ≤ 2).
Serviço propositalmente sem scikit-learn no runtime da API: o treino roda
offline e salva só os coeficientes + uma curva pré-computada num JSON
pequeno (`backend/review_risk_model.json`, versionado no repo); a API faz o
sigmoid na mão (ver [backend/review_risk.py](backend/review_risk.py)). O
dashboard tem um simulador interativo — [`ReviewRiskSimulator`](frontend/src/components/ReviewRiskSimulator.tsx) — com slider de dias e toggle no
prazo/atrasado.

Pra retreinar (por exemplo depois de recarregar o dataset):

```bash
pip install -r ml/requirements.txt
python ml/train_review_risk_model.py
```

## Tratamento de erro

- **API**: parâmetros de data inválidos devolvem 422 automaticamente
  (validação do Pydantic); `start_date` depois de `end_date` devolve 400;
  banco fora do ar devolve 503 com mensagem clara em vez de vazar stacktrace.
- **Frontend**: tela de erro com botão "Tentar novamente" quando a API está
  fora do ar (mostra a mensagem real vinda do backend); cada gráfico mostra
  "Nenhum dado para esse filtro" em vez de renderizar vazio quando uma
  combinação de filtros não retorna resultados.

## Explorando com SQL puro

`analysis/queries.sql` tem uma bateria de queries prontas — boas para praticar
para entrevistas (casing):

1. Receita (GMV) mês a mês
2. Funil de status dos pedidos
3. Performance de entrega (% no prazo, tempo médio)
4. Nota média: entregas no prazo vs. atrasadas
5. Top 10 categorias por receita
6. Receita por estado
7. Taxa de recompra
8. Distribuição de método de pagamento
9. Distribuição de notas de avaliação
10. Ticket médio por pedido
11. Densidade geográfica de pedidos (top 10 prefixos de CEP por receita)

## Licença dos dados

O dataset é da Olist, licenciado **CC BY-NC-SA 4.0** (uso não comercial, com
atribuição) — por isso os CSVs não ficam versionados neste repositório, veja
[data/README.md](data/README.md) para baixar.

## Licença

Código sob [MIT](LICENSE). Dataset sob CC BY-NC-SA 4.0 (ver seção acima).
