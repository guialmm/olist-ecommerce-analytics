import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DeliveryVsReview } from "../lib/api";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-surface px-3 py-2 text-[12px] shadow-tinted">
      <p className="mb-1 font-semibold text-white">{label} estrela{label !== 1 ? "s" : ""}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

export function DeliveryReviewChart({ data }: { data: DeliveryVsReview }) {
  const rows = useMemo(() => {
    return [1, 2, 3, 4, 5].map((score) => ({
      score,
      "No prazo": data.on_time.find((s) => s.score === score)?.pct ?? 0,
      Atrasado: data.late.find((s) => s.score === score)?.pct ?? 0,
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="score"
          tickFormatter={(s) => `${s}★`}
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#94A3B8", fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#64748B", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} iconType="circle" iconSize={8} />
        <Bar
          dataKey="No prazo"
          fill="#3B82F6"
          fillOpacity={0.85}
          radius={[4, 4, 0, 0]}
          animationDuration={1000}
          animationEasing="ease-out"
        />
        <Bar
          dataKey="Atrasado"
          fill="#f87171"
          fillOpacity={0.85}
          radius={[4, 4, 0, 0]}
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
