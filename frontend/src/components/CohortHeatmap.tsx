import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { CohortCell } from "../lib/api";

function formatMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function colorFor(pct: number): string {
  const t = Math.max(0, Math.min(1, pct / 100));
  const alpha = 0.08 + t * 0.85;
  return `rgba(59, 130, 246, ${alpha.toFixed(3)})`;
}

export function CohortHeatmap({ data }: { data: CohortCell[] }) {
  const [hover, setHover] = useState<CohortCell | null>(null);

  const { cohorts, maxMonths, grid } = useMemo(() => {
    const cohorts = [...new Set(data.map((d) => d.cohort_month))].sort();
    const maxMonths = Math.max(0, ...data.map((d) => d.months_since_signup));
    const grid = new Map<string, CohortCell>();
    data.forEach((d) => grid.set(`${d.cohort_month}-${d.months_since_signup}`, d));
    return { cohorts, maxMonths, grid };
  }, [data]);

  const cols = Math.min(maxMonths, 20);

  return (
    <div className="relative">
      {hover && (
        <div className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full">
          <div className="card-surface whitespace-nowrap px-3 py-1.5 text-[12px] shadow-xl">
            <span className="font-mono text-text-muted">{formatMonth(hover.cohort_month)}</span>{" "}
            <span className="text-text-muted">· mês {hover.months_since_signup}:</span>{" "}
            <span className="font-semibold text-white">{hover.retention_pct}%</span>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex">
            <div className="w-16 shrink-0" />
            {Array.from({ length: cols + 1 }, (_, m) => (
              <div
                key={m}
                className="w-7 shrink-0 text-center font-mono text-[10px] text-text-muted"
              >
                {m}
              </div>
            ))}
          </div>
          {cohorts.map((cohort, rowIdx) => (
            <div key={cohort} className="flex items-center">
              <div className="w-16 shrink-0 pr-2 text-right font-mono text-[11px] text-text-muted">
                {formatMonth(cohort)}
              </div>
              {Array.from({ length: cols + 1 }, (_, m) => {
                const cell = grid.get(`${cohort}-${m}`);
                if (!cell) return <div key={m} className="h-6 w-7 shrink-0" />;
                return (
                  <motion.div
                    key={m}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.3,
                      delay: rowIdx * 0.025 + m * 0.012,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    onMouseEnter={() => setHover(cell)}
                    onMouseLeave={() => setHover(null)}
                    className="m-[1px] h-6 w-7 shrink-0 cursor-default rounded-[3px]"
                    style={{ background: colorFor(cell.retention_pct) }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 font-mono text-[10px] text-text-muted">
        <span>0%</span>
        <div className="h-2 w-32 rounded-full bg-gradient-to-r from-[rgba(59,130,246,0.08)] to-[rgba(59,130,246,0.93)]" />
        <span>100% retenção</span>
      </div>
    </div>
  );
}
