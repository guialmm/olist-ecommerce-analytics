import { motion } from "framer-motion";
import type { FilterOptions } from "../lib/api";

interface Props {
  options: FilterOptions;
  selectedSegments: string[];
  selectedPlans: string[];
  onToggleSegment: (segment: string) => void;
  onTogglePlan: (plan: string) => void;
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? "border-accent/40 bg-accent-soft text-white"
          : "border-border text-text-muted hover:border-border-strong hover:text-text-dim"
      }`}
    >
      {label}
    </motion.button>
  );
}

export function FilterBar({
  options,
  selectedSegments,
  selectedPlans,
  onToggleSegment,
  onTogglePlan,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="card-surface flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-text-muted">
          Segmento
        </span>
        {options.segments.map((s) => (
          <Chip
            key={s}
            label={s}
            active={selectedSegments.includes(s)}
            onClick={() => onToggleSegment(s)}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-text-muted">
          Plano
        </span>
        {options.plans.map((p) => (
          <Chip
            key={p}
            label={p}
            active={selectedPlans.includes(p)}
            onClick={() => onTogglePlan(p)}
          />
        ))}
      </div>
    </motion.div>
  );
}
