import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function SectionCard({ title, subtitle, children, delay = 0, className = "" }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`card p-6 ${className}`}
    >
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {subtitle && (
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-text-muted">
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </motion.section>
  );
}
