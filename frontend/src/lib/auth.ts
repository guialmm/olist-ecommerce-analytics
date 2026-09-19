const TOKEN_KEY = "olist_analytics_token";
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // localStorage pode estar indisponível (modo privado, cookies bloqueados) —
    // a sessão simplesmente não sobrevive a um refresh nesse caso.
    return null;
  }
}

function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // idem — falha silenciosa, o login ainda funciona pro resto da sessão em memória
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // nada a fazer
  }
}

export async function login(username: string, password: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error(`Não foi possível conectar à API em ${API_BASE}.`);
  }
  if (!res.ok) {
    let detail = "Usuário ou senha inválidos.";
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // corpo de erro não era JSON — mantém a mensagem genérica
    }
    throw new Error(detail);
  }
  const body = (await res.json()) as { access_token: string };
  setToken(body.access_token);
  return body.access_token;
}
