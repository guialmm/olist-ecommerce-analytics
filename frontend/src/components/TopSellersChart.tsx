import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TopSeller } from "../lib/api";

interface RankedSeller extends TopSeller {
  label: string;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as RankedSeller;
  return (
    <div className="card-surface px-3 py-2 text-[12px] shadow-xl">
      <p className="font-semibold text-white">{p.label}</p>
      <p className="text-text-muted font-mono">id: {p.seller_id}…</p>
      <p className="text-text-muted">R$ {Math.round(p.revenue).toLocaleString("pt-BR")}</p>
      <p className="text-text-muted">{p.orders} pedidos</p>
    </div>
  );
}

export function TopSellersChart({ data }: { data: TopSeller[] }) {
  const sorted: RankedSeller[] = [...data]
    .sort((a, b) => b.revenue - a.revenue)
    .map((seller, i) => ({ ...seller, label: `#${i + 1} · ${seller.seller_state}` }));

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
          dataKey="label"
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#94A3B8", fontSize: 12 }}
          tickLine={false}
          width={64}
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
