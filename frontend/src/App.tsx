import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Background } from "./components/Background";
import { ChurnChart } from "./components/ChurnChart";
import { CohortHeatmap } from "./components/CohortHeatmap";
import { FilterBar } from "./components/FilterBar";
import { KpiCard } from "./components/KpiCard";
import { MrrChart } from "./components/MrrChart";
import { Nav } from "./components/Nav";
import { RevenueChart } from "./components/RevenueChart";
import { SectionCard } from "./components/SectionCard";
import { UsageBoxPlot } from "./components/UsageBoxPlot";
import {
  api,
  type ChurnPoint,
  type CohortCell,
  type FilterOptions,
  type Kpis,
  type MrrPoint,
  type RevenuePoint,
  type UsageVsChurn,
} from "./lib/api";

export default function App() {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [segments, setSegments] = useState<string[]>([]);
  const [plans, setPlans] = useState<string[]>([]);

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [mrr, setMrr] = useState<MrrPoint[]>([]);
  const [churn, setChurn] = useState<ChurnPoint[]>([]);
  const [cohort, setCohort] = useState<CohortCell[]>([]);
  const [usage, setUsage] = useState<UsageVsChurn | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .filterOptions()
      .then((opts) => {
        setFilterOptions(opts);
        setSegments(opts.segments);
        setPlans(opts.plans);
      })
      .catch(() => setError("Não foi possível conectar à API em http://localhost:8000."));
  }, []);

  useEffect(() => {
    if (!filterOptions) return;
    const f = { segments, plans };
    Promise.all([
      api.kpis(f),
      api.mrr(f),
      api.churn(f),
      api.cohort(f),
      api.usageVsChurn(f),
      api.revenue(f),
    ])
      .then(([k, m, c, co, u, r]) => {
        setKpis(k);
        setMrr(m);
        setChurn(c);
        setCohort(co);
        setUsage(u);
        setRevenue(r);
        setError(null);
      })
      .catch(() => setError("Erro ao carregar os dados."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions, segments, plans]);

  const toggleSegment = (s: string) =>
    setSegments((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const togglePlan = (p: string) =>
    setPlans((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

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
            Saúde de um SaaS fictício — MRR, churn, retenção por cohort e uso do produto.
          </p>
        </motion.div>

        {filterOptions && (
          <div className="mb-6">
            <FilterBar
              options={filterOptions}
              selectedSegments={segments}
              selectedPlans={plans}
              onToggleSegment={toggleSegment}
              onTogglePlan={togglePlan}
            />
          </div>
        )}

        {kpis && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              label="MRR atual"
              value={kpis.mrr}
              delay={0}
              format={(v) => `US$ ${Math.round(v).toLocaleString("pt-BR")}`}
              trend="up"
            />
            <KpiCard
              label="Assinaturas ativas"
              value={kpis.active_subscriptions}
              delay={0.08}
              format={(v) => Math.round(v).toLocaleString("pt-BR")}
            />
            <KpiCard
              label="Usuários (filtro)"
              value={kpis.total_users}
              delay={0.16}
              format={(v) => Math.round(v).toLocaleString("pt-BR")}
            />
            <KpiCard
              label="Conversão trial→pago"
              value={kpis.conversion_rate}
              delay={0.24}
              format={(v) => `${v.toFixed(1)}%`}
              trend="up"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SectionCard title="MRR ao longo do tempo" subtitle="receita recorrente mensal">
            <MrrChart data={mrr} />
          </SectionCard>

          <SectionCard title="Cancelamentos por mês" subtitle="volume de churn" delay={0.05}>
            <ChurnChart data={churn} />
          </SectionCard>

          <SectionCard
            title="Cohort retention"
            subtitle="% ativos por mês desde o cadastro"
            delay={0.1}
          >
            <CohortHeatmap data={cohort} />
          </SectionCard>

          <SectionCard
            title="Uso do produto: retidos vs. cancelados"
            subtitle="sessões médias/mês por usuário"
            delay={0.15}
          >
            {usage?.retained && usage?.canceled ? (
              <UsageBoxPlot retained={usage.retained} canceled={usage.canceled} />
            ) : (
              <p className="py-10 text-center text-sm text-text-muted">Sem dados suficientes.</p>
            )}
          </SectionCard>

          <SectionCard
            title="Receita por segmento e plano"
            subtitle="assinaturas ativas"
            delay={0.2}
          >
            <RevenueChart data={revenue} />
          </SectionCard>
        </div>

        <footer className="mt-10 pb-6 text-center font-mono text-[11px] text-text-muted">
          dados sintéticos gerados para fins de estudo — não representam uma empresa real
        </footer>
      </main>
    </div>
  );
}
