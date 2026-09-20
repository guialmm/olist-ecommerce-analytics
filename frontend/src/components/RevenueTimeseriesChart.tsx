import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenuePoint } from "../lib/api";
import { formatCurrency, formatMonth } from "../lib/format";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-surface px-3 py-2 text-[12px] shadow-tinted">
      <p className="mb-1 font-mono text-text-muted">{formatMonth(label)}</p>
      <p className="font-semibold text-white">{formatCurrency(payload[0].value)}</p>
      <p className="text-text-muted">{payload[0].payload.orders} pedidos</p>
    </div>
  );
}

export function RevenueTimeseriesChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#64748B", fontSize: 11 }}
          tickLine={false}
          interval={2}
        />
        <YAxis
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#64748B", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#3B82F6"
          strokeWidth={2.5}
          fill="url(#revenueFill)"
          animationDuration={1200}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
