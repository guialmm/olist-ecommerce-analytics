import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Background } from "./components/Background";
import { DateRangePicker } from "./components/DateRangePicker";
import { DeliveryReviewChart } from "./components/DeliveryReviewChart";
import { EmptyState } from "./components/EmptyState";
import { FilterBar } from "./components/FilterBar";
import { FreightChart } from "./components/FreightChart";
import { KpiCard } from "./components/KpiCard";
import { Nav } from "./components/Nav";
import { OrderStatusChart } from "./components/OrderStatusChart";
import { PaymentMethodsChart } from "./components/PaymentMethodsChart";
import { RevenueTimeseriesChart } from "./components/RevenueTimeseriesChart";
import { SectionCard } from "./components/SectionCard";
import { ChartSkeleton, KpiCardSkeleton } from "./components/Skeleton";
import { StateRevenueChart } from "./components/StateRevenueChart";
import { TopCategoriesChart } from "./components/TopCategoriesChart";
import { TopSellersChart } from "./components/TopSellersChart";
import {
  api,
  ApiError,
  type CategoryRevenue,
  type DeliveryVsReview,
  type FilterOptions,
  type FreightByState,
  type Kpis,
  type OrderStatusPoint,
  type PaymentMethod,
  type RevenuePoint,
  type StateRevenue,
  type TopSeller,
} from "./lib/api";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Erro inesperado ao carregar os dados.";
}

interface Props {
  onLogout: () => void;
  onSessionExpired: () => void;
}

export default function Dashboard({ onLogout, onSessionExpired }: Props) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [orderStatus, setOrderStatus] = useState<OrderStatusPoint[]>([]);
  const [deliveryVsReview, setDeliveryVsReview] = useState<DeliveryVsReview | null>(null);
  const [topCategories, setTopCategories] = useState<CategoryRevenue[]>([]);
  const [revenueByState, setRevenueByState] = useState<StateRevenue[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [freightByState, setFreightByState] = useState<FreightByState[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [retryTick, setRetryTick] = useState(0);

  const handleFailure = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        onSessionExpired();
        return;
      }
      setError(errorMessage(err));
    },
    [onSessionExpired],
  );

  const loadFilterOptions = useCallback(() => {
    setError(null);
    api.filterOptions().then(setFilterOptions).catch(handleFailure);
  }, [handleFailure]);

  useEffect(loadFilterOptions, [loadFilterOptions, retryTick]);

  useEffect(() => {
    if (!filterOptions) return;
    const f = { states, categories, startDate, endDate };
    Promise.all([
      api.kpis(f),
      api.revenue(f),
      api.orderStatus(f),
      api.deliveryVsReview(f),
      api.topCategories(f),
      api.revenueByState(f),
      api.paymentMethods(f),
      api.freightByState(f),
      api.topSellers(f),
    ])
      .then(([k, rev, os, dvr, tc, rbs, pm, fbs, ts]) => {
        setKpis(k);
        setRevenue(rev);
        setOrderStatus(os);
        setDeliveryVsReview(dvr);
        setTopCategories(tc);
        setRevenueByState(rbs);
        setPaymentMethods(pm);
        setFreightByState(fbs);
        setTopSellers(ts);
        setError(null);
        setInitialLoading(false);
      })
      .catch(handleFailure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions, states, categories, startDate, endDate]);

  const retry = () => setRetryTick((n) => n + 1);

  const toggleState = (s: string) =>
    setStates((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleCategory = (c: string) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  if (error) {
    return (
      <div className="relative min-h-screen">
        <Background />
        <div className="relative z-10 grid min-h-screen place-items-center px-6 text-center">
          <div className="card max-w-md p-8">
            <p className="text-lg font-semibold">Não foi possível carregar o dashboard</p>
            <p className="mt-2 text-sm text-text-dim">{error}</p>
            <p className="mt-4 text-[12px] text-text-muted">
              Verifique se a API está rodando (
              <code className="font-mono text-accent">uvicorn main:app --port 8000</code> na
              pasta <code className="font-mono">backend/</code>) e se o MySQL está de pé (
              <code className="font-mono text-accent">docker compose up -d</code>).
            </p>
            <button
              onClick={retry}
              className="mt-5 rounded-full border border-accent/40 bg-accent-soft px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent/20"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Background />
      <Nav onLogout={onLogout} />
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
          <div className="mb-6 flex flex-col gap-3">
            <div className="card-surface px-5 py-4">
              <DateRangePicker
                minDate={filterOptions.min_date}
                maxDate={filterOptions.max_date}
                startDate={startDate}
                endDate={endDate}
                onChange={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                }}
              />
            </div>
            <FilterBar
              options={filterOptions}
              selectedStates={states}
              selectedCategories={categories}
              onToggleState={toggleState}
              onToggleCategory={toggleCategory}
            />
          </div>
        )}

        {initialLoading && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </div>
        )}
        {kpis && !initialLoading && (
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
            {initialLoading ? (
              <ChartSkeleton height={280} />
            ) : revenue.length === 0 ? (
              <EmptyState height={280} />
            ) : (
              <RevenueTimeseriesChart data={revenue} />
            )}
          </SectionCard>

          <SectionCard title="Status dos pedidos" subtitle="volume por status" delay={0.05}>
            {initialLoading ? (
              <ChartSkeleton />
            ) : orderStatus.length === 0 ? (
              <EmptyState />
            ) : (
              <OrderStatusChart data={orderStatus} />
            )}
          </SectionCard>

          <SectionCard
            title="Entrega no prazo × nota da avaliação"
            subtitle="distribuição de notas (1-5 estrelas)"
            delay={0.1}
          >
            {initialLoading || !deliveryVsReview ? (
              <ChartSkeleton />
            ) : deliveryVsReview.on_time.length === 0 && deliveryVsReview.late.length === 0 ? (
              <EmptyState />
            ) : (
              <DeliveryReviewChart data={deliveryVsReview} />
            )}
          </SectionCard>

          <SectionCard
            title="Top 10 categorias por receita"
            subtitle="valor total vendido"
            delay={0.15}
          >
            {initialLoading ? (
              <ChartSkeleton height={300} />
            ) : topCategories.length === 0 ? (
              <EmptyState height={300} />
            ) : (
              <TopCategoriesChart data={topCategories} />
            )}
          </SectionCard>

          <SectionCard title="Receita por estado" subtitle="top estados do cliente" delay={0.2}>
            {initialLoading ? (
              <ChartSkeleton />
            ) : revenueByState.length === 0 ? (
              <EmptyState />
            ) : (
              <StateRevenueChart data={revenueByState} />
            )}
          </SectionCard>

          <SectionCard
            title="Métodos de pagamento"
            subtitle="participação no valor total"
            delay={0.25}
          >
            {initialLoading ? (
              <ChartSkeleton />
            ) : paymentMethods.length === 0 ? (
              <EmptyState />
            ) : (
              <PaymentMethodsChart data={paymentMethods} />
            )}
          </SectionCard>

          <SectionCard
            title="Frete por estado do cliente"
            subtitle="% do valor do item, estados mais caros primeiro"
            delay={0.3}
          >
            {initialLoading ? (
              <ChartSkeleton />
            ) : freightByState.length === 0 ? (
              <EmptyState />
            ) : (
              <FreightChart data={freightByState} />
            )}
          </SectionCard>

          <SectionCard
            title="Top 10 vendedores por receita"
            subtitle="marketplace — lado da oferta"
            delay={0.35}
          >
            {initialLoading ? (
              <ChartSkeleton height={300} />
            ) : topSellers.length === 0 ? (
              <EmptyState height={300} />
            ) : (
              <TopSellersChart data={topSellers} />
            )}
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
