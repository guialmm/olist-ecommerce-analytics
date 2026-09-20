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
        <div className="grid h-8 w-8 place-items-center border border-accent/40 bg-accent-soft font-mono text-[11px] font-bold text-accent">
          OE
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[15px] font-semibold tracking-tight">Olist Analytics</span>
          <span className="text-[13px] text-text-muted">receita · entregas · avaliações</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-[11px] text-text-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-up opacity-75 motion-reduce:hidden" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-up shadow-[0_0_8px_var(--color-up)]" />
            </span>
            dados reais · live query
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="rounded-full border border-border px-3 py-1 text-[12px] text-text-muted transition hover:border-border-strong hover:text-text-dim active:scale-[0.96]"
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
