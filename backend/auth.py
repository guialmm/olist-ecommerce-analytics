"""
Autenticação simples de demonstração (usuário único) para o dashboard.

Os dados analisados são os mesmos para qualquer pessoa (não há "dono" dos
dados), então não existe um sistema de contas de verdade aqui — isso é uma
camada de login no estilo JWT pra mostrar o padrão (hash de senha, token
com expiração, dependency de autenticação protegendo rotas) num contexto
onde faz sentido: por padrão o dashboard não fica público.

Credenciais vêm de variáveis de ambiente (.env) — nunca hardcoded.
"""

import datetime
import os

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12  # 12h — confortável pra uma demo de portfólio

DEMO_USERNAME = os.getenv("DEMO_USERNAME", "demo")
_DEMO_PASSWORD_HASH = bcrypt.hashpw(
    os.getenv("DEMO_PASSWORD", "olist2018").encode(), bcrypt.gensalt()
)

_bearer_scheme = HTTPBearer(auto_error=False)


def verify_credentials(username: str, password: str) -> bool:
    if username != DEMO_USERNAME:
        return False
    return bcrypt.checkpw(password.encode(), _DEMO_PASSWORD_HASH)


def create_access_token(username: str) -> str:
    expires_at = datetime.datetime.now(datetime.UTC) + datetime.timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": username, "exp": expires_at}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada, faça login de novo.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido.")
    return payload["sub"]
