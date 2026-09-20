import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenuePoint } from "../lib/api";
import { formatCurrency, formatMonth } from "../lib/format";

/**
 * Datas reais do calendário de varejo brasileiro dentro do período do
 * dataset (set/2016 a out/2018). Nov/2017 é a única com um salto isolado
 * e inconfundível nos dados (Out 660k → Nov 1,004k → Dez 742k); as outras
 * marcam o período sem alegar um pico específico que os dados não sustentam.
 */
const ANNOTATIONS: Record<string, string> = {
  "2017-11-01": "Black Friday",
  "2017-12-01": "Natal",
  "2018-05-01": "Dia das Mães",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-surface px-3 py-2 text-[12px] shadow-tinted">
      <p className="mb-1 font-mono text-text-muted">{formatMonth(label)}</p>
      <p className="font-semibold text-text">{formatCurrency(payload[0].value)}</p>
      <p className="text-text-muted">{payload[0].payload.orders} pedidos</p>
    </div>
  );
}

export function RevenueTimeseriesChart({ data }: { data: RevenuePoint[] }) {
  const months = new Set(data.map((d) => d.month));
  const visibleAnnotations = Object.entries(ANNOTATIONS).filter(([month]) => months.has(month));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 44, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0a020" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#f0a020" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#6b6a62", fontSize: 11 }}
          tickLine={false}
          interval={2}
        />
        <YAxis
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#6b6a62", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#f0a020"
          strokeWidth={2.5}
          fill="url(#revenueFill)"
          animationDuration={1200}
          animationEasing="ease-out"
        />
        {visibleAnnotations.map(([month, label]) => (
          <ReferenceLine
            key={month}
            x={month}
            stroke="rgba(250,248,240,0.35)"
            strokeDasharray="3 3"
            label={{
              value: label,
              position: "insideTop",
              angle: -90,
              fill: "#a3a29a",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
              dx: -8,
              dy: 6,
            }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
