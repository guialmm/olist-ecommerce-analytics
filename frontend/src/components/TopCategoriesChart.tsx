import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryRevenue } from "../lib/api";
import { formatCurrency, humanize } from "../lib/format";

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as CategoryRevenue;
  return (
    <div className="card-surface px-3 py-2 text-[12px] shadow-tinted">
      <p className="font-semibold text-text">{humanize(p.category)}</p>
      <p className="text-text-muted">{formatCurrency(p.revenue)}</p>
      <p className="mt-1 text-[11px] text-accent">clique pra filtrar</p>
    </div>
  );
}

interface Props {
  data: CategoryRevenue[];
  selectedCategories?: string[];
  onSelectCategory?: (category: string) => void;
}

export function TopCategoriesChart({ data, selectedCategories = [], onSelectCategory }: Props) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#6b6a62", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          tickFormatter={humanize}
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#a3a29a", fontSize: 11 }}
          tickLine={false}
          width={130}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar
          dataKey="revenue"
          radius={[0, 0, 0, 0]}
          animationDuration={1000}
          animationEasing="ease-out"
          cursor={onSelectCategory ? "pointer" : undefined}
          onClick={(d: any) => onSelectCategory?.(d.category)}
        >
          {sorted.map((d) => (
            <Cell
              key={d.category}
              fill="#f0a020"
              fillOpacity={
                selectedCategories.length === 0
                  ? 0.8
                  : selectedCategories.includes(d.category)
                    ? 1
                    : 0.3
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
