# Olist E-Commerce Analytics

Projeto de portfólio/estudo: dados **reais** e anonimizados de e-commerce
brasileiro (o [Brazilian E-Commerce Public Dataset by Olist](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce),
~100 mil pedidos entre 2016 e 2018), carregados num banco relacional próprio
(MySQL) e servidos por uma API (FastAPI) para um dashboard animado
(React + TypeScript + Tailwind + Framer Motion + Recharts).

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
- `product_categories` — tradução pt → en das categorias
- `products` — catálogo (categoria, dimensões, peso)
- `orders` — pedidos (status, timestamps de compra/aprovação/entrega)
- `order_items` — itens de cada pedido (preço, frete, vendedor)
- `order_payments` — pagamentos (tipo, parcelas, valor)
- `order_reviews` — avaliações (nota 1-5, comentário)

## Stack

- **MySQL 8** (Docker)
- **Python** (pandas, SQLAlchemy, PyMySQL) para o ETL
- **FastAPI** — API REST que serve o dashboard
- **React + TypeScript + Tailwind + Framer Motion + Recharts** — frontend animado

## Setup

```bash
# 1. Subir o MySQL (cria o schema automaticamente na primeira vez)
cp .env.example .env
docker compose up -d

# 2. Ambiente Python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -r backend/requirements.txt

# 3. Baixar o dataset real (precisa de conta + API key no Kaggle)
pip install kaggle
kaggle datasets download -d olistbr/brazilian-ecommerce -p data/raw --unzip

# 4. Carregar no MySQL
python etl/load_to_mysql.py

# 5. Criar as views de análise
mysql -h 127.0.0.1 -u olist_user -p olist_analytics < sql/views.sql
# (senha em .env, MYSQL_PASSWORD)

# 6. Subir a API
cd backend && uvicorn main:app --port 8000
# em outro terminal:

# 7. Subir o frontend
cd frontend
cp .env.example .env
npm install
npm run dev
# abre em http://localhost:5173 (API em http://localhost:8000)
```

## Testes

Backend (pytest — 38 testes: unitários nas funções puras de `analytics.py` +
integração da API contra o MySQL real; pula com uma mensagem clara se o banco
não estiver de pé):

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

Frontend (Vitest + Testing Library — 38 testes: funções de formatação,
`lib/api.ts`, componentes e o fluxo completo do `App` com a API mockada):

```bash
cd frontend
npm test          # roda uma vez
npm run test:watch  # modo watch
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

## Licença dos dados

O dataset é da Olist, licenciado **CC BY-NC-SA 4.0** (uso não comercial, com
atribuição) — por isso os CSVs não ficam versionados neste repositório, veja
[data/README.md](data/README.md) para baixar.

## Próximos passos possíveis

- Tabela `geolocation` do dataset (~1M linhas) para um mapa de calor de pedidos
- Modelo simples prevendo nota da avaliação a partir do tempo de entrega
- Deploy do frontend (Vercel/Netlify) + backend (Railway/Render) + banco
  gerenciado, pra link público no portfólio
