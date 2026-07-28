import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { kpiQuery } from "@/lib/queries";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics/quality")({
  head: () => ({
    meta: [
      { title: "Waste & Quality — MANUFACTUREIQ" },
      { name: "description", content: "Analisis reject, rework, dan waste material terhadap total output." },
      { property: "og:title", content: "Waste & Quality — MANUFACTUREIQ" },
      { property: "og:description", content: "Pantau kualitas produksi dan pemborosan material." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QualityPage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function QualityPage() {
  const { data, isLoading } = useQuery(kpiQuery);
  const rows = (data ?? []) as Row[];

  const byProduct = useMemo(() => {
    const map = new Map<string, { reject: number; rework: number; waste: number; total: number }>();
    rows.forEach((r) => {
      const key = String(r.product_name ?? "-");
      const cur = map.get(key) ?? { reject: 0, rework: 0, waste: 0, total: 0 };
      map.set(key, {
        reject: cur.reject + num(r.reject_qty),
        rework: cur.rework + num(r.rework_qty),
        waste: cur.waste + num(r.waste_material),
        total: cur.total + num(r.total_output),
      });
    });
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.reject - a.reject)
      .slice(0, 10);
  }, [rows]);

  const totalOutput = rows.reduce((s, r) => s + num(r.total_output), 0);
  const totalReject = rows.reduce((s, r) => s + num(r.reject_qty), 0);
  const totalRework = rows.reduce((s, r) => s + num(r.rework_qty), 0);
  const totalWaste = rows.reduce((s, r) => s + num(r.waste_material), 0);

  const columns: Column<Row>[] = [
    { key: "production_date", header: "Tanggal", render: (r) => formatDate(r.production_date as string) },
    { key: "product_name", header: "Produk" },
    { key: "machine_code", header: "Mesin" },
    { key: "total_output", header: "Total Output", align: "right", render: (r) => formatNumber(num(r.total_output)) },
    { key: "reject_qty", header: "Reject", align: "right", render: (r) => formatNumber(num(r.reject_qty)) },
    { key: "rework_qty", header: "Rework", align: "right", render: (r) => formatNumber(num(r.rework_qty)) },
    { key: "waste_material", header: "Waste", align: "right", render: (r) => formatNumber(num(r.waste_material)) },
    {
      key: "reject_rate",
      header: "Reject Rate",
      align: "right",
      value: (r) => num(r.reject_rate),
      render: (r) => formatPercent(num(r.reject_rate), 2),
    },
  ];

  return (
    <>
      <PageHeader
        title="Waste & Quality"
        description="Identifikasi produk dan mesin dengan tingkat reject tertinggi."
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Output" value={formatNumber(totalOutput)} tone="info" />
        <KpiCard
          label="Reject Rate"
          value={formatPercent(totalOutput ? (totalReject / totalOutput) * 100 : 0, 2)}
          tone="danger"
        />
        <KpiCard label="Total Rework" value={formatNumber(totalRework)} tone="warning" />
        <KpiCard label="Waste Material" value={formatNumber(totalWaste)} tone="purple" />
      </div>

      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Reject, Rework & Waste per Produk</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byProduct}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="reject" name="Reject" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rework" name="Rework" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="waste" name="Waste" fill="var(--color-purple)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="waste-quality" />
    </>
  );
}
