import { PackageCheck, Wallet } from "lucide-react";
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { actualCostsQuery, hppQuery, lossQuery } from "@/lib/queries";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/costing/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Cost Management — MANUFACTUREIQ" },
      { name: "description", content: "Ringkasan biaya produksi aktual, struktur biaya, dan nilai kerugian." },
      { property: "og:title", content: "Dashboard Cost Management — MANUFACTUREIQ" },
      { property: "og:description", content: "Kontrol biaya produksi dan efisiensi HPP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CostDashboard,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);
const COLORS = [
  "var(--color-primary)",
  "var(--color-info)",
  "var(--color-warning)",
  "var(--color-purple)",
  "var(--color-destructive)",
];

function CostDashboard() {
  const actual = useQuery(actualCostsQuery);
  const loss = useQuery(lossQuery);
  const hpp = useQuery(hppQuery);

  const rows = (actual.data ?? []) as Row[];
  const lossRows = (loss.data ?? []) as Row[];

  const totalCost = rows.reduce((s, r) => s + num(r.total_cost), 0);
  const totalOutput = rows.reduce((s, r) => s + num(r.good_output), 0);
  const costPerUnit = totalOutput ? totalCost / totalOutput : 0;
  const totalLoss = lossRows.reduce((s, r) => s + num(r.loss_value), 0);
  const lossRatio = totalCost ? (totalLoss / totalCost) * 100 : 0;

  const activeVersion = ((hpp.data ?? []) as Row[]).find((v) => v.status === "Aktif");
  const stdAvg = useMemo(() => {
    const details = ((activeVersion?.standard_hpp_details as Row[]) ?? []) as Row[];
    if (!details.length) return 0;
    return details.reduce((s, d) => s + num(d.hpp_per_unit), 0) / details.length;
  }, [activeVersion]);

  const structure = [
    { name: "Material", value: rows.reduce((s, r) => s + num(r.actual_material_cost), 0) },
    { name: "Mesin", value: rows.reduce((s, r) => s + num(r.machine_cost), 0) },
    { name: "Tenaga Kerja", value: rows.reduce((s, r) => s + num(r.labor_cost), 0) },
    { name: "Overhead", value: rows.reduce((s, r) => s + num(r.overhead_cost), 0) },
    { name: "Rework", value: rows.reduce((s, r) => s + num(r.rework_cost), 0) },
  ].filter((d) => d.value > 0);

  const trend = useMemo(() => {
    const map = new Map<string, { name: string; Biaya: number; Output: number }>();
    rows.forEach((r) => {
      const k = String(r.period_date ?? "");
      const e = map.get(k) ?? { name: k, Biaya: 0, Output: 0 };
      e.Biaya += num(r.total_cost);
      e.Output += num(r.good_output);
      map.set(k, e);
    });
    return [...map.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-14)
      .map((d) => ({
        name: formatDate(d.name),
        "Biaya/Unit": d.Output ? Math.round(d.Biaya / d.Output) : 0,
      }));
  }, [rows]);

  const lossByType = useMemo(() => {
    const map = new Map<string, number>();
    lossRows.forEach((r) => {
      const k = String(r.loss_type ?? "-");
      map.set(k, (map.get(k) ?? 0) + num(r.loss_value));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [lossRows]);

  const columns: Column<Row>[] = [
    { key: "period_date", header: "Periode", render: (r) => formatDate(r.period_date as string) },
    {
      key: "wo",
      header: "Work Order",
      value: (r) => (r.work_orders as { wo_number?: string } | null)?.wo_number ?? "-",
    },
    {
      key: "actual_material_cost",
      header: "Material",
      align: "right",
      render: (r) => formatCurrency(num(r.actual_material_cost)),
    },
    { key: "machine_cost", header: "Mesin", align: "right", render: (r) => formatCurrency(num(r.machine_cost)) },
    { key: "labor_cost", header: "Tenaga Kerja", align: "right", render: (r) => formatCurrency(num(r.labor_cost)) },
    { key: "overhead_cost", header: "Overhead", align: "right", render: (r) => formatCurrency(num(r.overhead_cost)) },
    {
      key: "total_cost",
      header: "Total Biaya",
      align: "right",
      value: (r) => num(r.total_cost),
      render: (r) => formatCurrency(num(r.total_cost)),
    },
    {
      key: "cost_per_unit",
      header: "Biaya / Unit",
      align: "right",
      value: (r) => (num(r.good_output) ? num(r.total_cost) / num(r.good_output) : 0),
      render: (r) =>
        formatCurrency(num(r.good_output) ? num(r.total_cost) / num(r.good_output) : 0),
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard Cost Management"
        description="Pantau biaya produksi aktual, struktur biaya, dan dampak kerugian terhadap HPP."
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<PackageCheck className="size-4" />} label="Total Biaya Produksi" value={formatCurrency(totalCost)} tone="primary" />
        <KpiCard icon={<Wallet className="size-4" />} label="Biaya per Unit Aktual" value={formatCurrency(costPerUnit)} tone="info" />
        <KpiCard icon={<Wallet className="size-4" />} label="HPP Standar Rata-rata" value={formatCurrency(stdAvg)} tone="purple" />
        <KpiCard icon={<Wallet className="size-4" />} label="Rasio Loss" value={formatPercent(lossRatio)} tone={lossRatio > 5 ? "danger" : "success"} />
      </div>
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tren Biaya per Unit</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="Biaya/Unit" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Struktur Biaya</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={structure} dataKey="value" nameKey="name" innerRadius={50} outerRadius={88}>
                  {structure.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      {lossByType.length > 0 && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Nilai Loss per Jenis</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lossByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      <DataTable<Row> columns={columns} rows={rows} loading={actual.isLoading} exportName="biaya-produksi" />
    </>
  );
}
