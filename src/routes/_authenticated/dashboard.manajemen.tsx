import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Boxes, Gauge, PiggyBank, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useGlobalFilter } from "@/lib/filter-context";
import {
  formatCompactCurrency,
  formatNumber,
  formatPercent,
  speedIndexClass,
} from "@/lib/format";
import {
  downtimeQuery,
  hppQuery,
  kpiQuery,
  lossQuery,
  machineHealthQuery,
  salesOrdersQuery,
  stockQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard/manajemen")({
  head: () => ({
    meta: [
      { title: "Dashboard Manajemen — MANUFACTUREIQ" },
      {
        name: "description",
        content: "Ringkasan OEE, output, backlog, biaya produksi, dan estimasi laba pabrik.",
      },
      { property: "og:title", content: "Dashboard Manajemen — MANUFACTUREIQ" },
      {
        property: "og:description",
        content: "Pantau performa pabrik dan estimasi profitabilitas secara real-time.",
      },
    ],
  }),
  component: ManagementDashboard,
});

type KpiRow = {
  production_date: string;
  plant_id: string | null;
  shift_id: string | null;
  total_output: number;
  good_output: number;
  reject_qty: number;
  rework_qty: number;
  target_qty: number;
  downtime_minutes: number;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  speed_index: number;
};

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function ManagementDashboard() {
  const { filter } = useGlobalFilter();
  const kpi = useQuery(kpiQuery);
  const health = useQuery(machineHealthQuery);
  const orders = useQuery(salesOrdersQuery);
  const stock = useQuery(stockQuery);
  const loss = useQuery(lossQuery);
  const hpp = useQuery(hppQuery);
  const downtime = useQuery(downtimeQuery);

  const rows = useMemo(() => {
    const data = (kpi.data ?? []) as KpiRow[];
    return data.filter(
      (r) =>
        r.production_date >= filter.from &&
        r.production_date <= filter.to &&
        (!filter.plantId || r.plant_id === filter.plantId) &&
        (!filter.shiftId || r.shift_id === filter.shiftId),
    );
  }, [kpi.data, filter]);

  const agg = useMemo(() => {
    const sum = (k: keyof KpiRow) => rows.reduce((a, r) => a + Number(r[k] ?? 0), 0);
    const avg = (k: keyof KpiRow) =>
      rows.length ? rows.reduce((a, r) => a + Number(r[k] ?? 0), 0) / rows.length : 0;
    return {
      output: sum("total_output"),
      good: sum("good_output"),
      target: sum("target_qty"),
      reject: sum("reject_qty"),
      rework: sum("rework_qty"),
      downtime: sum("downtime_minutes"),
      oee: avg("oee"),
      availability: avg("availability"),
      performance: avg("performance"),
      quality: avg("quality"),
      speed: avg("speed_index"),
    };
  }, [rows]);

  const trend = useMemo(() => {
    const byDate = new Map<string, { date: string; output: number; target: number; oee: number; n: number }>();
    for (const r of rows) {
      const e = byDate.get(r.production_date) ?? {
        date: r.production_date,
        output: 0,
        target: 0,
        oee: 0,
        n: 0,
      };
      e.output += Number(r.total_output ?? 0);
      e.target += Number(r.target_qty ?? 0);
      e.oee += Number(r.oee ?? 0);
      e.n += 1;
      byDate.set(r.production_date, e);
    }
    return [...byDate.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ ...e, oee: e.n ? e.oee / e.n : 0 }));
  }, [rows]);

  const downtimePareto = useMemo(() => {
    const list = (downtime.data ?? []) as Array<{
      duration_minutes: number;
      downtime_reason_codes: { name: string } | null;
    }>;
    const map = new Map<string, number>();
    for (const d of list) {
      const key = d.downtime_reason_codes?.name ?? "Lainnya";
      map.set(key, (map.get(key) ?? 0) + Number(d.duration_minutes ?? 0));
    }
    return [...map.entries()]
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 6);
  }, [downtime.data]);

  const orderStats = useMemo(() => {
    const list = (orders.data ?? []) as Array<{ status: string; total_value: number | null }>;
    const map = new Map<string, number>();
    let value = 0;
    for (const o of list) {
      map.set(o.status, (map.get(o.status) ?? 0) + 1);
      value += Number(o.total_value ?? 0);
    }
    return {
      value,
      count: list.length,
      pie: [...map.entries()].map(([name, v]) => ({ name, value: v })),
    };
  }, [orders.data]);

  const stockValue = useMemo(
    () =>
      ((stock.data ?? []) as Array<{ qty_on_hand: number; avg_cost: number | null }>).reduce(
        (a, s) => a + Number(s.qty_on_hand ?? 0) * Number(s.avg_cost ?? 0),
        0,
      ),
    [stock.data],
  );

  const lossValue = useMemo(
    () =>
      ((loss.data ?? []) as Array<{ total_loss_value: number | null }>).reduce(
        (a, l) => a + Number(l.total_loss_value ?? 0),
        0,
      ),
    [loss.data],
  );

  const avgHpp = useMemo(() => {
    const details = ((hpp.data ?? []) as Array<{ standard_hpp_details: Array<{ total_hpp: number }> }>)
      .flatMap((v) => v.standard_hpp_details ?? []);
    return details.length
      ? details.reduce((a, d) => a + Number(d.total_hpp ?? 0), 0) / details.length
      : 0;
  }, [hpp.data]);

  const estimatedRevenue = orderStats.value;
  const estimatedCogs = agg.good * avgHpp;
  const estimatedProfit = estimatedRevenue - estimatedCogs - lossValue;
  const margin = estimatedRevenue ? (estimatedProfit / estimatedRevenue) * 100 : 0;
  const si = speedIndexClass(agg.speed);

  const machines = (health.data ?? []) as Array<{
    machine_id: string;
    machine_code: string;
    machine_name: string;
    mtbf_hours: number | null;
    mttr_minutes: number | null;
    failure_count: number | null;
    condition_label: string | null;
  }>;

  return (
    <div>
      <PageHeader
        title="Dashboard Manajemen"
        description="Ringkasan eksekutif performa pabrik, order, biaya, dan estimasi profitabilitas."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="OEE Rata-rata"
          value={formatPercent(agg.oee)}
          sub={`A ${formatPercent(agg.availability)} · P ${formatPercent(agg.performance)} · Q ${formatPercent(agg.quality)}`}
          icon={<Gauge className="size-4" />}
          tone={agg.oee >= 75 ? "success" : agg.oee >= 60 ? "warning" : "danger"}
        />
        <KpiCard
          label="Output vs Target"
          value={`${formatNumber(agg.output)} / ${formatNumber(agg.target)}`}
          sub={`Pencapaian ${formatPercent(agg.target ? (agg.output / agg.target) * 100 : 0)}`}
          icon={<Target className="size-4" />}
          tone="info"
        />
        <KpiCard
          label="Speed Index"
          value={`${formatNumber(agg.speed, 2)}×`}
          sub={si.label}
          icon={<Activity className="size-4" />}
          tone={si.tone}
        />
        <KpiCard
          label="Estimasi Laba"
          value={formatCompactCurrency(estimatedProfit)}
          sub={`Margin ${formatPercent(margin)}`}
          icon={<PiggyBank className="size-4" />}
          tone={estimatedProfit >= 0 ? "success" : "danger"}
        />
        <KpiCard
          label="Nilai Order Aktif"
          value={formatCompactCurrency(estimatedRevenue)}
          sub={`${orderStats.count} sales order`}
          icon={<TrendingUp className="size-4" />}
          tone="primary"
        />
        <KpiCard
          label="Estimasi HPP Terpakai"
          value={formatCompactCurrency(estimatedCogs)}
          sub={`HPP rata-rata ${formatCompactCurrency(avgHpp)}/unit`}
          icon={<PiggyBank className="size-4" />}
          tone="warning"
        />
        <KpiCard
          label="Nilai Inventory"
          value={formatCompactCurrency(stockValue)}
          sub="Berdasarkan average cost"
          icon={<Boxes className="size-4" />}
          tone="purple"
        />
        <KpiCard
          label="Nilai Loss Produksi"
          value={formatCompactCurrency(lossValue)}
          sub={`Reject ${formatNumber(agg.reject)} · Rework ${formatNumber(agg.rework)}`}
          icon={<Activity className="size-4" />}
          tone="danger"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tren Output vs Target &amp; OEE</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="gOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="output"
                  name="Output"
                  stroke="var(--color-chart-1)"
                  fill="url(#gOutput)"
                />
                <Line type="monotone" dataKey="target" name="Target" stroke="var(--color-chart-4)" dot={false} />
                <Line type="monotone" dataKey="oee" name="OEE %" stroke="var(--color-chart-2)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Komposisi Status Order</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStats.pie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {orderStats.pie.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pareto Penyebab Downtime</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={downtimePareto} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="minutes" name="Menit" fill="var(--color-chart-5)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kesehatan Mesin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {machines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data kesehatan mesin.</p>
            ) : (
              machines.slice(0, 6).map((m) => (
                <div
                  key={m.machine_id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.machine_code} · {m.machine_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MTBF {formatNumber(m.mtbf_hours ?? 0, 1)} jam · MTTR{" "}
                      {formatNumber(m.mttr_minutes ?? 0, 1)} menit · {m.failure_count ?? 0} kejadian
                    </p>
                  </div>
                  <StatusBadge status={m.condition_label ?? "Normal"} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
