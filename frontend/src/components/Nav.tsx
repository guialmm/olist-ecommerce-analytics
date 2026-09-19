import { motion } from "framer-motion";

interface Props {
  onLogout?: () => void;
}

export function Nav({ onLogout }: Props) {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="glass-nav sticky top-0 z-50"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent font-mono text-[11px] font-bold text-white shadow-[0_6px_20px_var(--color-accent-glow)]">
          OE
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight">Olist Analytics</span>
          <span className="text-[13px] text-text-muted">receita · entregas · avaliações</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-up shadow-[0_0_8px_var(--color-up)]" />
            dados reais · live query
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="rounded-full border border-border px-3 py-1 text-[12px] text-text-muted transition-colors hover:border-border-strong hover:text-text-dim"
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
