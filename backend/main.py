import datetime
import logging

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, SQLAlchemyError

import analytics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("olist_api")

app = FastAPI(title="Olist E-Commerce Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


class Filters:
    """Query params compartilhados por todo endpoint de análise.

    Usar `datetime.date` (em vez de `str`) faz o FastAPI/Pydantic validar o
    formato de data automaticamente e devolver 422 com uma mensagem clara
    se vier algo inválido — em vez de estourar um erro de SQL lá na frente.
    """

    def __init__(
        self,
        states: list[str] | None = Query(None, description="UF do cliente (ex: SP, RJ)"),
        categories: list[str] | None = Query(None, description="Categoria do produto (nome em inglês)"),
        start_date: datetime.date | None = Query(None, description="Data inicial (YYYY-MM-DD)"),
        end_date: datetime.date | None = Query(None, description="Data final (YYYY-MM-DD)"),
    ):
        if start_date and end_date and start_date > end_date:
            raise HTTPException(status_code=400, detail="start_date não pode ser depois de end_date")
        self.states = states or []
        self.categories = categories or []
        self.start_date = start_date.isoformat() if start_date else None
        self.end_date = end_date.isoformat() if end_date else None


@app.exception_handler(OperationalError)
async def db_unavailable_handler(request: Request, exc: OperationalError):
    logger.error("Banco indisponível em %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Banco de dados indisponível. Verifique se o MySQL está rodando "
            "(docker compose up -d)."
        },
    )


@app.exception_handler(SQLAlchemyError)
async def db_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Erro de banco em %s: %s", request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "Erro ao consultar o banco de dados."})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Erro não tratado em %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Erro interno inesperado."})


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/filters")
def filters():
    return analytics.get_filter_options()


@app.get("/api/kpis")
def kpis(f: Filters = Depends()):
    return analytics.get_kpis(f.states, f.categories, f.start_date, f.end_date)


@app.get("/api/revenue")
def revenue(f: Filters = Depends()):
    return analytics.get_revenue_timeseries(f.states, f.categories, f.start_date, f.end_date)


@app.get("/api/order-status")
def order_status(f: Filters = Depends()):
    return analytics.get_order_status(f.states, f.categories, f.start_date, f.end_date)


@app.get("/api/delivery-vs-review")
def delivery_vs_review(f: Filters = Depends()):
    return analytics.get_delivery_vs_review(f.states, f.categories, f.start_date, f.end_date)


@app.get("/api/top-categories")
def top_categories(f: Filters = Depends()):
    return analytics.get_top_categories(f.states, f.categories, f.start_date, f.end_date)


@app.get("/api/revenue-by-state")
def revenue_by_state(f: Filters = Depends()):
    return analytics.get_revenue_by_state(f.states, f.categories, f.start_date, f.end_date)


@app.get("/api/payment-methods")
def payment_methods(f: Filters = Depends()):
    return analytics.get_payment_methods(f.states, f.categories, f.start_date, f.end_date)


@app.get("/api/freight-by-state")
def freight_by_state(f: Filters = Depends()):
    return analytics.get_freight_by_state(f.states, f.categories, f.start_date, f.end_date)


@app.get("/api/top-sellers")
def top_sellers(f: Filters = Depends()):
    return analytics.get_top_sellers(f.states, f.categories, f.start_date, f.end_date)
