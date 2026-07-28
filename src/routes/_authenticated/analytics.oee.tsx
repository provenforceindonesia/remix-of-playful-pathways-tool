import { Activity, BadgeCheck, Gauge } from "lucide-react";
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
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

export const Route = createFileRoute("/_authenticated/analytics/oee")({
  head: () => ({
    meta: [
      { title: "Analisis OEE — MANUFACTUREIQ" },
      { name: "description", content: "Overall Equipment Effectiveness: availability, performance, dan quality." },
      { property: "og:title", content: "Analisis OEE — MANUFACTUREIQ" },
      { property: "og:description", content: "Pantau OEE pabrik beserta komponen penyusunnya." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OeePage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);
const avg = (rows: Row[], key: string) =>
  rows.length ? rows.reduce((s, r) => s + num(r[key]), 0) / rows.length : 0;

function OeePage() {
  const { data, isLoading } = useQuery(kpiQuery);
  const rows = (data ?? []) as Row[];

  const chart = useMemo(() => {
    const map = new Map<string, Row[]>();
    rows.forEach((r) => {
      const d = String(r.production_date);
      map.set(d, [...(map.get(d) ?? []), r]);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, list]) => ({
        date: formatDate(date),
        oee: Math.round(avg(list, "oee")),
        availability: Math.round(avg(list, "availability")),
        performance: Math.round(avg(list, "performance")),
        quality: Math.round(avg(list, "quality")),
      }));
  }, [rows]);

  const columns: Column<Row>[] = [
    { key: "production_date", header: "Tanggal", render: (r) => formatDate(r.production_date as string) },
    { key: "machine_code", header: "Mesin" },
    { key: "shift_name", header: "Shift" },
    { key: "availability", header: "Availability", align: "right", value: (r) => num(r.availability), render: (r) => formatPercent(num(r.availability)) },
    { key: "performance", header: "Performance", align: "right", value: (r) => num(r.performance), render: (r) => formatPercent(num(r.performance)) },
    { key: "quality", header: "Quality", align: "right", value: (r) => num(r.quality), render: (r) => formatPercent(num(r.quality)) },
    { key: "oee", header: "OEE", align: "right", value: (r) => num(r.oee), render: (r) => formatPercent(num(r.oee)) },
    { key: "lost_output", header: "Lost Output", align: "right", render: (r) => formatNumber(num(r.lost_output)) },
  ];

  return (
    <>
      <PageHeader
        title="Analisis OEE"
        description="OEE = Availability × Performance × Quality dari entri produksi tervalidasi."
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Gauge className="size-4" />} label="OEE Rata-rata" value={formatPercent(avg(rows, "oee"))} tone="primary" />
        <KpiCard icon={<Activity className="size-4" />} label="Availability" value={formatPercent(avg(rows, "availability"))} tone="info" />
        <KpiCard icon={<Activity className="size-4" />} label="Performance" value={formatPercent(avg(rows, "performance"))} tone="warning" />
        <KpiCard icon={<BadgeCheck className="size-4" />} label="Quality" value={formatPercent(avg(rows, "quality"))} tone="success" />
      </div>

      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tren Komponen OEE</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="oee" name="OEE" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.2} />
              <Area type="monotone" dataKey="availability" name="Availability" stroke="var(--color-info)" fill="transparent" />
              <Area type="monotone" dataKey="performance" name="Performance" stroke="var(--color-warning)" fill="transparent" />
              <Area type="monotone" dataKey="quality" name="Quality" stroke="var(--color-success)" fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="oee" />
    </>
  );
}
