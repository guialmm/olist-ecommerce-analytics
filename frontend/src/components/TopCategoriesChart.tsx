import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryRevenue } from "../lib/api";

function humanize(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as CategoryRevenue;
  return (
    <div className="card-surface px-3 py-2 text-[12px] shadow-xl">
      <p className="font-semibold text-white">{humanize(p.category)}</p>
      <p className="text-text-muted">R$ {Math.round(p.revenue).toLocaleString("pt-BR")}</p>
    </div>
  );
}

export function TopCategoriesChart({ data }: { data: CategoryRevenue[] }) {
  const sorted = [...data].sort((a, b) => a.revenue - b.revenue).slice(-10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#64748B", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          tickFormatter={humanize}
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#94A3B8", fontSize: 11 }}
          tickLine={false}
          width={130}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar
          dataKey="revenue"
          fill="#3B82F6"
          fillOpacity={0.8}
          radius={[0, 4, 4, 0]}
          animationDuration={1000}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
