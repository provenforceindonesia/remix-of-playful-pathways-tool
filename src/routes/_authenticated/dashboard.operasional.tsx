import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downtimeQuery, kpiQuery, workOrdersQuery } from "@/lib/queries";
import { durationLabel, formatDate, formatNumber, formatPercent, speedIndexClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/operasional")({
  head: () => ({
    meta: [
      { title: "Dashboard Operasional — MANUFACTUREIQ" },
      { name: "description", content: "Pantau output harian, OEE, downtime, dan status work order berjalan." },
      { property: "og:title", content: "Dashboard Operasional — MANUFACTUREIQ" },
      { property: "og:description", content: "Kontrol harian performa lantai produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OperationalDashboard,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function OperationalDashboard() {
  const { data: kpi } = useQuery(kpiQuery);
  const { data: wos, isLoading } = useQuery(workOrdersQuery);
  const { data: downtime } = useQuery(downtimeQuery);

  const kpiRows = (kpi ?? []) as Row[];
  const woRows = (wos ?? []) as Row[];
  const dtRows = (downtime ?? []) as Row[];

  const trend = useMemo(() => {
    const map = new Map<string, { good: number; target: number; oee: number; n: number }>();
    kpiRows.forEach((r) => {
      const d = String(r.production_date);
      const cur = map.get(d) ?? { good: 0, target: 0, oee: 0, n: 0 };
      map.set(d, {
        good: cur.good + num(r.good_output),
        target: cur.target + num(r.target_output),
        oee: cur.oee + num(r.oee),
        n: cur.n + 1,
      });
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([d, v]) => ({
        date: formatDate(d),
        good: Math.round(v.good),
        target: Math.round(v.target),
        oee: v.n ? Math.round(v.oee / v.n) : 0,
      }));
  }, [kpiRows]);

  const running = woRows.filter((w) => w.status === "Berjalan").length;
  const totalGood = kpiRows.reduce((s, r) => s + num(r.good_output), 0);
  const avgOee = kpiRows.length ? kpiRows.reduce((s, r) => s + num(r.oee), 0) / kpiRows.length : 0;
  const totalDowntime = dtRows.reduce((s, r) => s + num(r.duration_minutes), 0);

  const columns: Column<Row>[] = [
    { key: "wo_number", header: "No. WO" },
    { key: "product", header: "Produk", value: (r) => (r.products as { name?: string } | null)?.name ?? "-" },
    { key: "machine", header: "Mesin", value: (r) => (r.machines as { code?: string } | null)?.code ?? "-" },
    { key: "target_qty", header: "Target", align: "right", render: (r) => formatNumber(num(r.target_qty)) },
    { key: "priority", header: "Prioritas", render: (r) => <StatusBadge status={String(r.priority ?? "-")} /> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
    { key: "planned_finish", header: "Target Selesai", render: (r) => formatDate(r.planned_finish as string) },
  ];

  const speed = speedIndexClass(
    kpiRows.length ? kpiRows.reduce((s, r) => s + num(r.speed_index), 0) / kpiRows.length : 0,
  );

  return (
    <>
      <PageHeader title="Dashboard Operasional" description="Ringkasan performa produksi harian." />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="WO Berjalan" value={running} tone="primary" />
        <KpiCard label="Good Output" value={formatNumber(totalGood)} tone="success" />
        <KpiCard label="OEE Rata-rata" value={formatPercent(avgOee)} sub={speed.label} tone="info" />
        <KpiCard label="Total Downtime" value={durationLabel(totalDowntime)} tone="warning" />
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Output vs Target</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="target" name="Target" fill="var(--color-muted-foreground)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="good" name="Good Output" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tren OEE</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="oee" name="OEE" stroke="var(--color-success)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <DataTable<Row> columns={columns} rows={woRows.slice(0, 50)} loading={isLoading} exportName="wo-aktif" />
    </>
  );
}
