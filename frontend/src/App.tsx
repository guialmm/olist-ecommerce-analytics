import { lazy, Suspense, useEffect, useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { api } from "./lib/api";
import { clearToken, getToken } from "./lib/auth";

// Dashboard puxa Recharts (a maior dependência do bundle) — carregar sob
// demanda mantém a tela de login leve, já que ninguém vê o dashboard antes
// de autenticar.
const Dashboard = lazy(() => import("./Dashboard"));

type AuthState = "checking" | "authenticated" | "unauthenticated";

export default function App() {
  const [authState, setAuthState] = useState<AuthState>("checking");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthState("unauthenticated");
      return;
    }
    api
      .me()
      .then(() => setAuthState("authenticated"))
      .catch(() => {
        clearToken();
        setAuthState("unauthenticated");
      });
  }, []);

  const handleLogout = () => {
    clearToken();
    setAuthState("unauthenticated");
  };

  if (authState === "checking") {
    return <div className="min-h-screen" />;
  }

  if (authState === "unauthenticated") {
    return <LoginPage onSuccess={() => setAuthState("authenticated")} />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Dashboard onLogout={handleLogout} onSessionExpired={handleLogout} />
    </Suspense>
  );
}
