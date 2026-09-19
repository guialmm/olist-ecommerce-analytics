import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenuePoint } from "../lib/api";

const PLAN_COLORS: Record<string, string> = {
  Starter: "#60A5FA",
  Pro: "#3B82F6",
  Business: "#1D4ED8",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-surface px-3 py-2 text-[12px] shadow-xl">
      <p className="mb-1 font-semibold text-white">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.dataKey}: US$ {Math.round(p.value).toLocaleString("pt-BR")}
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const { rows, plans } = useMemo(() => {
    const segments = [...new Set(data.map((d) => d.segment))];
    const plans = [...new Set(data.map((d) => d.plan_name))].sort(
      (a, b) => Object.keys(PLAN_COLORS).indexOf(a) - Object.keys(PLAN_COLORS).indexOf(b),
    );
    const rows = segments.map((segment) => {
      const row: Record<string, string | number> = { segment };
      plans.forEach((plan) => {
        row[plan] = data.find((d) => d.segment === segment && d.plan_name === plan)?.mrr ?? 0;
      });
      return row;
    });
    return { rows, plans };
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="segment"
          stroke="rgba(255,255,255,0.08)"
          tick={{ fill: "#94A3B8", fontSize: 12 }}
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
        <Legend
          wrapperStyle={{ fontSize: 12, color: "#94A3B8" }}
          iconType="circle"
          iconSize={8}
        />
        {plans.map((plan, i) => (
          <Bar
            key={plan}
            dataKey={plan}
            stackId="rev"
            fill={PLAN_COLORS[plan] ?? "#3B82F6"}
            radius={i === plans.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
