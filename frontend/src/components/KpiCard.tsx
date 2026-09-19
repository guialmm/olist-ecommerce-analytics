import { motion } from "framer-motion";
import { useCountUp } from "../hooks/useCountUp";

interface Props {
  label: string;
  value: number;
  delay?: number;
  format: (v: number) => string;
  trend?: "up" | "down" | "neutral";
}

export function KpiCard({ label, value, delay = 0, format, trend = "neutral" }: Props) {
  const animated = useCountUp(value);

  const trendColor =
    trend === "up" ? "text-up" : trend === "down" ? "text-down" : "text-text-muted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="card-surface relative overflow-hidden px-5 py-4"
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent-soft blur-2xl" />
      <p className="text-[12px] font-medium text-text-muted">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums tracking-tight">
        {format(animated)}
      </p>
      {trend !== "neutral" && (
        <p className={`mt-1 text-[11px] font-medium ${trendColor}`}>
          {trend === "up" ? "↑ saudável" : "↓ atenção"}
        </p>
      )}
    </motion.div>
  );
}
