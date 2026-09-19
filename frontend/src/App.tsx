import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Background } from "./components/Background";
import { DeliveryReviewChart } from "./components/DeliveryReviewChart";
import { FilterBar } from "./components/FilterBar";
import { KpiCard } from "./components/KpiCard";
import { Nav } from "./components/Nav";
import { OrderStatusChart } from "./components/OrderStatusChart";
import { PaymentMethodsChart } from "./components/PaymentMethodsChart";
import { RevenueTimeseriesChart } from "./components/RevenueTimeseriesChart";
import { SectionCard } from "./components/SectionCard";
import { StateRevenueChart } from "./components/StateRevenueChart";
import { TopCategoriesChart } from "./components/TopCategoriesChart";
import {
  api,
  type CategoryRevenue,
  type DeliveryVsReview,
  type FilterOptions,
  type Kpis,
  type OrderStatusPoint,
  type PaymentMethod,
  type RevenuePoint,
  type StateRevenue,
} from "./lib/api";

export default function App() {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatusPoint[]>([]);
  const [deliveryVsReview, setDeliveryVsReview] = useState<DeliveryVsReview | null>(null);
  const [topCategories, setTopCategories] = useState<CategoryRevenue[]>([]);
  const [revenueByState, setRevenueByState] = useState<StateRevenue[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .filterOptions()
      .then(setFilterOptions)
      .catch(() => setError("Não foi possível conectar à API em http://localhost:8000."));
  }, []);

  useEffect(() => {
    if (!filterOptions) return;
    const f = { states, categories };
    Promise.all([
      api.kpis(f),
      api.revenue(f),
      api.orderStatus(f),
      api.deliveryVsReview(f),
      api.topCategories(f),
      api.revenueByState(f),
      api.paymentMethods(f),
    ])
      .then(([k, rev, os, dvr, tc, rbs, pm]) => {
        setKpis(k);
        setRevenue(rev);
        setOrderStatus(os);
        setDeliveryVsReview(dvr);
        setTopCategories(tc);
        setRevenueByState(rbs);
        setPaymentMethods(pm);
        setError(null);
      })
      .catch(() => setError("Erro ao carregar os dados."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions, states, categories]);

  const toggleState = (s: string) =>
    setStates((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleCategory = (c: string) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">{error}</p>
          <p className="mt-2 text-sm text-text-muted">
            Rode <code className="font-mono text-accent">uvicorn main:app --port 8000</code> na
            pasta <code className="font-mono">backend/</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Background />
      <Nav />
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-[13px] text-text-dim">
            Olist — e-commerce brasileiro real (2016-2018): receita, entregas, categorias e
            avaliações.
          </p>
        </motion.div>

        {filterOptions && (
          <div className="mb-6">
            <FilterBar
              options={filterOptions}
              selectedStates={states}
              selectedCategories={categories}
              onToggleState={toggleState}
              onToggleCategory={toggleCategory}
            />
          </div>
        )}

        {kpis && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              label="Receita (GMV)"
              value={kpis.revenue}
              delay={0}
              format={(v) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`}
              deltaPct={kpis.revenue_trend_pct}
              deltaLabel="vs. mês anterior"
            />
            <KpiCard
              label="Pedidos"
              value={kpis.orders}
              delay={0.08}
              format={(v) => Math.round(v).toLocaleString("pt-BR")}
              deltaPct={kpis.orders_trend_pct}
              deltaLabel="vs. mês anterior"
            />
            <KpiCard
              label="Ticket médio"
              value={kpis.avg_order_value}
              delay={0.16}
              format={(v) => `R$ ${v.toFixed(2)}`}
              deltaPct={kpis.avg_order_value_trend_pct}
              deltaLabel="vs. mês anterior"
            />
            <KpiCard
              label="Entregas no prazo"
              value={kpis.pct_on_time}
              delay={0.24}
              format={(v) => `${v.toFixed(1)}%`}
              deltaPct={kpis.pct_on_time_trend_pct}
              deltaSuffix="pp"
              deltaLabel="vs. mês anterior"
            />
          </div>
        )}
        {kpis?.latest_month && (
          <p className="-mt-4 mb-6 text-[11px] text-text-muted">
            Variações comparam o último mês completo do dataset (
            {new Date(kpis.latest_month + "T00:00:00").toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
            ) com o mês anterior.
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SectionCard title="Receita mensal (GMV)" subtitle="valor dos itens vendidos">
            <RevenueTimeseriesChart data={revenue} />
          </SectionCard>

          <SectionCard title="Status dos pedidos" subtitle="volume por status" delay={0.05}>
            <OrderStatusChart data={orderStatus} />
          </SectionCard>

          <SectionCard
            title="Entrega no prazo × nota da avaliação"
            subtitle="distribuição de notas (1-5 estrelas)"
            delay={0.1}
          >
            {deliveryVsReview ? (
              <DeliveryReviewChart data={deliveryVsReview} />
            ) : (
              <p className="py-10 text-center text-sm text-text-muted">Carregando…</p>
            )}
          </SectionCard>

          <SectionCard
            title="Top 10 categorias por receita"
            subtitle="valor total vendido"
            delay={0.15}
          >
            <TopCategoriesChart data={topCategories} />
          </SectionCard>

          <SectionCard title="Receita por estado" subtitle="top estados do cliente" delay={0.2}>
            <StateRevenueChart data={revenueByState} />
          </SectionCard>

          <SectionCard
            title="Métodos de pagamento"
            subtitle="participação no valor total"
            delay={0.25}
          >
            <PaymentMethodsChart data={paymentMethods} />
          </SectionCard>
        </div>

        <footer className="mt-10 pb-6 text-center font-mono text-[11px] text-text-muted">
          dados reais e anonimizados — Brazilian E-Commerce Public Dataset by Olist (Kaggle,
          CC BY-NC-SA 4.0)
        </footer>
      </main>
    </div>
  );
}
