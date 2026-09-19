import { motion } from "framer-motion";
import { useState } from "react";
import { login } from "../lib/auth";
import { Background } from "./Background";

interface Props {
  onSuccess: () => void;
}

export function LoginPage({ onSuccess }: Props) {
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <Background />
      <div className="relative z-10 grid min-h-screen place-items-center px-6">
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={handleSubmit}
          className="card w-full max-w-sm p-7"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent font-mono text-[12px] font-bold text-white shadow-[0_6px_20px_var(--color-accent-glow)]">
              OE
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">Olist Analytics</p>
              <p className="text-[12px] text-text-muted">entre para ver o dashboard</p>
            </div>
          </div>

          <label className="mb-1 block text-[12px] font-medium text-text-dim" htmlFor="username">
            Usuário
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[14px] outline-none transition-colors focus:border-accent/50"
          />

          <label className="mb-1 block text-[12px] font-medium text-text-dim" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[14px] outline-none transition-colors focus:border-accent/50"
          />

          <p className="mb-4 text-[11px] text-text-muted">
            Demo pública: usuário <code className="font-mono text-accent">demo</code>, senha{" "}
            <code className="font-mono text-accent">olist2018</code>
          </p>

          {error && <p className="mb-4 text-[13px] text-down">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent px-4 py-2 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
