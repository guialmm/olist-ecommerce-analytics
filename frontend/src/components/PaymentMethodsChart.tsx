import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PaymentMethod } from "../lib/api";

const LABELS: Record<string, string> = {
  credit_card: "Cartão de crédito",
  boleto: "Boleto",
  voucher: "Voucher",
  debit_card: "Cartão de débito",
  not_defined: "Não definido",
};

const COLORS = ["#f0a020", "#f4b84d", "#c9791a", "#8a5211", "#6b6a62"];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PaymentMethod;
  return (
    <div className="card-surface px-3 py-2 text-[12px] shadow-tinted">
      <p className="font-semibold text-text">{LABELS[p.payment_type] ?? p.payment_type}</p>
      <p className="text-text-muted">R$ {Math.round(p.total_value).toLocaleString("pt-BR")}</p>
      <p className="text-text-muted">{p.n_orders.toLocaleString("pt-BR")} pedidos</p>
    </div>
  );
}

export function PaymentMethodsChart({ data }: { data: PaymentMethod[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total_value"
          nameKey="payment_type"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          animationDuration={1000}
          animationEasing="ease-out"
        >
          {data.map((d, i) => (
            <Cell key={d.payment_type} fill={COLORS[i % COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) => LABELS[value] ?? value}
          wrapperStyle={{ fontSize: 12, color: "#a3a29a" }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
