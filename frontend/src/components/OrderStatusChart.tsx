import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OrderStatusPoint } from "../lib/api";

const LABELS: Record<string, string> = {
  delivered: "entregue",
  shipped: "enviado",
  canceled: "cancelado",
  unavailable: "indisponível",
  invoiced: "faturado",
  processing: "processando",
  created: "criado",
  approved: "aprovado",
};

const PROBLEM_STATUSES = new Set(["canceled", "unavailable"]);

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as OrderStatusPoint;
  return (
    <div className="card-surface px-3 py-2 text-[12px] shadow-tinted">
      <p className="font-semibold text-text">{LABELS[p.status] ?? p.status}</p>
      <p className="text-text-muted">{p.n_orders.toLocaleString("pt-BR")} pedidos</p>
    </div>
  );
}

export function OrderStatusChart({ data }: { data: OrderStatusPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
        <XAxis
          type="number"
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#6b6a62", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="status"
          tickFormatter={(s) => LABELS[s] ?? s}
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#a3a29a", fontSize: 12 }}
          tickLine={false}
          width={90}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="n_orders" radius={[0, 0, 0, 0]} animationDuration={900} animationEasing="ease-out">
          {data.map((d) => (
            <Cell key={d.status} fill={PROBLEM_STATUSES.has(d.status) ? "#f87171" : "#f0a020"} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
