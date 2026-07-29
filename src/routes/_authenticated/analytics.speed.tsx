import { Gauge, PackageCheck, Target } from "lucide-react";
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
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { kpiQuery } from "@/lib/queries";
import { formatDate, formatNumber, formatPercent, speedIndexClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics/speed")({
  head: () => ({
    meta: [
      { title: "Kecepatan & Output — MANUFACTUREIQ" },
      { name: "description", content: "Bandingkan kecepatan aktual terhadap standar dan pencapaian output." },
      { property: "og:title", content: "Kecepatan & Output — MANUFACTUREIQ" },
      { property: "og:description", content: "Analisis speed index dan pencapaian output produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpeedPage,
});

type Row = Record<string, unknown>;

const num = (v: unknown) => Number(v ?? 0);

function SpeedPage() {
  const { data, isLoading } = useQuery(kpiQuery);
  const rows = (data ?? []) as Row[];

  const chart = useMemo(
    () =>
      [...rows]
        .slice(0, 30)
        .reverse()
        .map((r) => ({
          date: formatDate(r.production_date as string),
          speed: Math.round(num(r.speed_index)),
          output: num(r.good_output),
          target: num(r.target_qty),
        })),
    [rows],
  );

  const avgSpeed = rows.length ? rows.reduce((s, r) => s + num(r.speed_index), 0) / rows.length : 0;
  const cls = speedIndexClass(avgSpeed);
  const totalGood = rows.reduce((s, r) => s + num(r.good_output), 0);
  const totalTarget = rows.reduce((s, r) => s + num(r.target_qty), 0);

  const columns: Column<Row>[] = [
    { key: "production_date", header: "Tanggal", render: (r) => formatDate(r.production_date as string) },
    { key: "wo_number", header: "Work Order" },
    { key: "machine_code", header: "Mesin" },
    { key: "good_output", header: "Good Output", align: "right", render: (r) => formatNumber(num(r.good_output)) },
    { key: "target_qty", header: "Target", align: "right", render: (r) => formatNumber(num(r.target_qty)) },
    {
      key: "speed_index",
      header: "Speed Index",
      align: "right",
      value: (r) => num(r.speed_index),
      render: (r) => formatPercent(num(r.speed_index)),
    },
    {
      key: "klasifikasi",
      header: "Klasifikasi",
      value: (r) => speedIndexClass(num(r.speed_index)).label,
      render: (r) => {
        const c = speedIndexClass(num(r.speed_index));
        return <StatusBadge status={c.label} tone={c.tone} />;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Kecepatan & Output"
        description="Speed index membandingkan kecepatan aktual terhadap kecepatan standar mesin."
      />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <KpiCard icon={<Gauge className="size-4" />} label="Rata-rata Speed Index" value={formatPercent(avgSpeed)} tone={cls.tone} sub={cls.label} />
        <KpiCard icon={<PackageCheck className="size-4" />} label="Total Good Output" value={formatNumber(totalGood)} tone="success" />
        <KpiCard icon={<Target className="size-4" />} label="Total Target" value={formatNumber(totalTarget)} tone="info" />
        <KpiCard icon={<Target className="size-4" />}
          label="Pencapaian Target"
          value={formatPercent(totalTarget ? (totalGood / totalTarget) * 100 : 0)}
          tone="primary"
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tren Speed Index</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="speed" name="Speed Index" stroke="var(--color-primary)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Output vs Target</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="output" name="Good Output" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Target" fill="var(--color-info)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <DataTable<Row> columns={columns} rows={rows} loading={isLoading} exportName="speed-output" />
    </>
  );
}
