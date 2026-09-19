import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StateRevenue } from "../lib/api";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-surface px-3 py-2 text-[12px] shadow-xl">
      <p className="font-semibold text-white">{label}</p>
      <p className="text-text-muted">R$ {Math.round(payload[0].value).toLocaleString("pt-BR")}</p>
    </div>
  );
}

export function StateRevenueChart({ data }: { data: StateRevenue[] }) {
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
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#64748B", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar
          dataKey="revenue"
          fill="#3B82F6"
          fillOpacity={0.8}
          radius={[4, 4, 0, 0]}
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
