import { useEffect, useState } from "react";
import { LoginPage } from "./components/LoginPage";
import Dashboard from "./Dashboard";
import { api } from "./lib/api";
import { clearToken, getToken } from "./lib/auth";

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

  return <Dashboard onLogout={handleLogout} onSessionExpired={handleLogout} />;
}
