import { motion } from "framer-motion";
import { useCountUp } from "../hooks/useCountUp";

interface Props {
  label: string;
  value: number;
  delay?: number;
  format: (v: number) => string;
  deltaPct?: number | null;
  deltaLabel?: string;
  deltaSuffix?: string;
}

export function KpiCard({
  label,
  value,
  delay = 0,
  format,
  deltaPct,
  deltaLabel,
  deltaSuffix = "%",
}: Props) {
  const animated = useCountUp(value);
  const hasDelta = deltaPct !== undefined && deltaPct !== null;
  const isUp = hasDelta && deltaPct! > 0;
  const isDown = hasDelta && deltaPct! < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="card-surface relative border-t-2 border-t-accent/50 px-5 py-4"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums tracking-tight">
        {format(animated)}
      </p>
      {hasDelta && (
        <p
          className={`mt-1 text-[11px] font-medium ${isUp ? "text-up" : isDown ? "text-down" : "text-text-muted"}`}
        >
          {isUp ? "↑" : isDown ? "↓" : "→"} {Math.abs(deltaPct!).toFixed(1)}
          {deltaSuffix}
          {deltaLabel && <span className="text-text-muted"> {deltaLabel}</span>}
        </p>
      )}
    </motion.div>
  );
}
