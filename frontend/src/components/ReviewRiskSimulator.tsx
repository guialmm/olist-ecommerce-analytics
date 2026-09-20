import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReviewRiskModel } from "../lib/api";

interface Props {
  data: ReviewRiskModel;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-surface px-3 py-2 text-[12px] shadow-tinted">
      <p className="mb-1 font-mono text-text-muted">{label} dias</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {(p.value * 100).toFixed(1)}%
        </p>
      ))}
    </div>
  );
}

export function ReviewRiskSimulator({ data }: Props) {
  const maxDays = data.curve[data.curve.length - 1]?.delivery_days ?? 45;
  const [deliveryDays, setDeliveryDays] = useState(Math.round(maxDays / 3));
  const [onTime, setOnTime] = useState(true);

  const point = useMemo(
    () => data.curve.find((p) => p.delivery_days === deliveryDays) ?? data.curve[0],
    [data.curve, deliveryDays],
  );
  const risk = onTime ? point.on_time_risk : point.late_risk;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-text-dim">
              Tempo de entrega: <span className="font-mono text-white">{deliveryDays} dias</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={maxDays}
            value={deliveryDays}
            onChange={(e) => setDeliveryDays(Number(e.target.value))}
            className="accent-accent"
          />
          <div className="flex gap-2">
            {[
              { label: "No prazo", value: true },
              { label: "Atrasado", value: false },
            ].map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setOnTime(opt.value)}
                className={`rounded-full border px-3 py-1 text-[12.5px] font-medium transition active:scale-[0.96] ${
                  onTime === opt.value
                    ? "border-accent/40 bg-accent-soft text-white"
                    : "border-border text-text-muted hover:border-border-strong hover:text-text-dim"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          key={`${deliveryDays}-${onTime}`}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="card-surface flex flex-col items-center px-6 py-4 text-center"
        >
          <span className="text-[11px] uppercase tracking-wide text-text-muted">
            risco de nota ≤ 2
          </span>
          <span
            className="mt-1 text-3xl font-bold"
            style={{ color: risk > 0.3 ? "#f87171" : risk > 0.15 ? "#facc15" : "#34d399" }}
          >
            {(risk * 100).toFixed(1)}%
          </span>
        </motion.div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="delivery_days"
            stroke="rgba(255,255,255,0.08)"
            tick={{ fill: "#64748B", fontSize: 11 }}
            tickLine={false}
            label={{ value: "dias de entrega", position: "insideBottom", offset: -4, fill: "#64748B", fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            stroke="rgba(255,255,255,0.08)"
            tick={{ fill: "#64748B", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="on_time_risk"
            name="No prazo"
            stroke="#34d399"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="late_risk"
            name="Atrasado"
            stroke="#f87171"
            strokeWidth={2}
            dot={false}
          />
          <ReferenceDot
            x={deliveryDays}
            y={risk}
            r={5}
            fill={onTime ? "#34d399" : "#f87171"}
            stroke="#0A1020"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-3 text-[11px] text-text-muted">
        Regressão logística (delivery_days + on_time), acurácia{" "}
        {(data.metrics.accuracy * 100).toFixed(1)}%, ROC-AUC {data.metrics.roc_auc.toFixed(2)}{" "}
        no conjunto de teste ({data.metrics.n_test.toLocaleString("pt-BR")} pedidos).
      </p>
    </div>
  );
}
