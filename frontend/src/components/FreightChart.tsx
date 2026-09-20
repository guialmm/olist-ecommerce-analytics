import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FreightByState } from "../lib/api";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as FreightByState;
  return (
    <div className="card-surface px-3 py-2 text-[12px] shadow-tinted">
      <p className="font-semibold text-white">{label}</p>
      <p className="text-text-muted">{p.avg_freight_pct}% do valor do item</p>
      <p className="text-text-muted">média R$ {p.avg_freight_value.toFixed(2)}</p>
    </div>
  );
}

export function FreightChart({ data }: { data: FreightByState[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="state"
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#94A3B8", fontSize: 11 }}
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
        <Bar
          dataKey="avg_freight_pct"
          fill="#f59e0b"
          fillOpacity={0.8}
          radius={[4, 4, 0, 0]}
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
