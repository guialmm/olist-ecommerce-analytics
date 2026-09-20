import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
  className?: string;
  onExportCsv?: () => void;
}

export function SectionCard({
  title,
  subtitle,
  children,
  delay = 0,
  className = "",
  onExportCsv,
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`card p-6 ${className}`}
    >
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        <div className="flex items-center gap-3">
          {subtitle && (
            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-text-muted">
              {subtitle}
            </span>
          )}
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1 font-mono text-[11px] text-text-muted transition hover:text-accent active:scale-[0.96]"
              title="Baixar CSV"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1.5v9m0 0L4.5 7M8 10.5L11.5 7M2 12.5v1a1 1 0 001 1h10a1 1 0 001-1v-1"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              csv
            </button>
          )}
        </div>
      </div>
      {children}
    </motion.section>
  );
}
