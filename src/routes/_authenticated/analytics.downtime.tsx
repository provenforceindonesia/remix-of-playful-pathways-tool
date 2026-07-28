import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downtimeQuery } from "@/lib/queries";
import { durationLabel, formatDate, formatNumber, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics/downtime")({
  head: () => ({
    meta: [
      { title: "Analisis Downtime — MANUFACTUREIQ" },
      { name: "description", content: "Analisis Pareto downtime mesin berdasarkan penyebab dan kategori." },
      { property: "og:title", content: "Analisis Downtime — MANUFACTUREIQ" },
      { property: "og:description", content: "Pareto penyebab downtime dan dampaknya pada produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DowntimeAnalyticsPage,
});

type Row = Record<string, unknown>;

function DowntimeAnalyticsPage() {
  const { data, isLoading } = useQuery(downtimeQuery);
  const rows = (data ?? []) as Row[];

  const pareto = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const key =
        (r.downtime_reason_codes as { name?: string } | null)?.name ??
        String(r.category ?? "Tidak diketahui");
      map.set(key, (map.get(key) ?? 0) + Number(r.duration_minutes ?? 0));
    });
    const list = [...map.entries()]
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10);
    const total = list.reduce((s, i) => s + i.minutes, 0) || 1;
    let acc = 0;
    return list.map((i) => {
      acc += i.minutes;
      return { ...i, cum: Math.round((acc / total) * 100) };
    });
  }, [rows]);

  const totalMinutes = rows.reduce((s, r) => s + Number(r.duration_minutes ?? 0), 0);
  const needMaintenance = rows.filter((r) => r.requires_maintenance).length;

  const columns: Column<Row>[] = [
    { key: "downtime_date", header: "Tanggal", render: (r) => formatDate(r.downtime_date as string) },
    { key: "machine", header: "Mesin", value: (r) => (r.machines as { code?: string } | null)?.code ?? "-" },
    { key: "category", header: "Kategori" },
    {
      key: "reason",
      header: "Penyebab",
      value: (r) => (r.downtime_reason_codes as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "duration_minutes",
      header: "Durasi",
      align: "right",
      value: (r) => Number(r.duration_minutes ?? 0),
      render: (r) => durationLabel(Number(r.duration_minutes ?? 0)),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  return (
    <>
      <PageHeader
        title="Analisis Downtime"
        description="Fokuskan perbaikan pada penyebab dengan kontribusi waktu henti terbesar."
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Downtime" value={durationLabel(totalMinutes)} tone="danger" />
        <KpiCard label="Kejadian" value={formatNumber(rows.length)} tone="warning" />
        <KpiCard
          label="Rata-rata / Kejadian"
          value={durationLabel(rows.length ? totalMinutes / rows.length : 0)}
          tone="info"
        />
        <KpiCard label="Butuh Maintenance" value={formatNumber(needMaintenance)} tone="purple" />
      </div>

      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pareto Penyebab Downtime</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pareto}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} height={60} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number, n: string) =>
                  n === "cum" ? formatPercent(v, 0) : durationLabel(v)
                }
              />
              <Bar yAxisId="left" dataKey="minutes" name="Menit" radius={[4, 4, 0, 0]}>
                {pareto.map((_, i) => (
                  <Cell key={i} fill="var(--color-primary)" opacity={1 - i * 0.07} />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="cum" name="cum" stroke="var(--color-warning)" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="analisis-downtime" />
    </>
  );
}

export const _unusedBarChart = BarChart;
