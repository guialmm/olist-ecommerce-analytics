import { motion } from "framer-motion";

export function Nav() {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="glass-nav sticky top-0 z-50"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent font-mono text-[11px] font-bold text-white shadow-[0_6px_20px_var(--color-accent-glow)]">
          SA
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight">SaaS Analytics</span>
          <span className="text-[13px] text-text-muted">churn · MRR · retenção</span>
        </div>
        <div className="ml-auto flex items-center gap-2 font-mono text-[11px] text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-up shadow-[0_0_8px_var(--color-up)]" />
          dados sintéticos · live query
        </div>
      </div>
    </motion.header>
  );
}
