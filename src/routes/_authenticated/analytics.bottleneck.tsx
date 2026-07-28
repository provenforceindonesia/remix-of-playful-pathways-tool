import { Activity, PackageCheck, TimerOff } from "lucide-react";
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { KpiCard } from "@/components/common/KpiCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { kpiQuery } from "@/lib/queries";
import { durationLabel, formatNumber, formatPercent, speedIndexClass } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analytics/bottleneck")({
  head: () => ({
    meta: [
      { title: "Bottleneck Analysis — MANUFACTUREIQ" },
      { name: "description", content: "Temukan mesin dan proses yang menjadi penghambat kapasitas produksi." },
      { property: "og:title", content: "Bottleneck Analysis — MANUFACTUREIQ" },
      { property: "og:description", content: "Identifikasi bottleneck lini produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BottleneckPage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

type Agg = {
  machine: string;
  downtime: number;
  lost: number;
  speed: number;
  oee: number;
  count: number;
};

function BottleneckPage() {
  const { data, isLoading } = useQuery(kpiQuery);
  const rows = (data ?? []) as Row[];

  const aggregated = useMemo<Agg[]>(() => {
    const map = new Map<string, Agg>();
    rows.forEach((r) => {
      const key = String(r.machine_code ?? "-");
      const cur =
        map.get(key) ?? { machine: key, downtime: 0, lost: 0, speed: 0, oee: 0, count: 0 };
      map.set(key, {
        machine: key,
        downtime: cur.downtime + num(r.downtime_minutes),
        lost: cur.lost + num(r.lost_output),
        speed: cur.speed + num(r.speed_index),
        oee: cur.oee + num(r.oee),
        count: cur.count + 1,
      });
    });
    return [...map.values()]
      .map((a) => ({
        ...a,
        speed: a.count ? a.speed / a.count : 0,
        oee: a.count ? a.oee / a.count : 0,
      }))
      .sort((a, b) => b.lost - a.lost);
  }, [rows]);

  const worst = aggregated[0];

  const columns: Column<Agg & Record<string, unknown>>[] = [
    { key: "machine", header: "Mesin" },
    { key: "count", header: "Entri", align: "right" },
    {
      key: "downtime",
      header: "Total Downtime",
      align: "right",
      value: (r) => r.downtime,
      render: (r) => durationLabel(r.downtime),
    },
    { key: "lost", header: "Lost Output", align: "right", render: (r) => formatNumber(r.lost) },
    {
      key: "speed",
      header: "Speed Index",
      align: "right",
      value: (r) => r.speed,
      render: (r) => formatPercent(r.speed),
    },
    { key: "oee", header: "OEE", align: "right", value: (r) => r.oee, render: (r) => formatPercent(r.oee) },
    {
      key: "klasifikasi",
      header: "Klasifikasi",
      value: (r) => speedIndexClass(r.speed).label,
      render: (r) => {
        const c = speedIndexClass(r.speed);
        return <StatusBadge status={c.label} tone={c.tone} />;
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Bottleneck Analysis"
        description="Mesin dengan lost output terbesar adalah kandidat bottleneck utama."
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard icon={<Activity className="size-4" />} label="Bottleneck Utama" value={worst?.machine ?? "-"} tone="danger" />
        <KpiCard icon={<PackageCheck className="size-4" />} label="Lost Output" value={formatNumber(worst?.lost ?? 0)} tone="warning" />
        <KpiCard icon={<TimerOff className="size-4" />} label="Downtime" value={durationLabel(worst?.downtime ?? 0)} tone="purple" />
      </div>

      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lost Output per Mesin</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aggregated.slice(0, 12)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="machine" type="category" width={90} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="lost" name="Lost Output" fill="var(--color-destructive)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={aggregated as (Agg & Record<string, unknown>)[]}
        loading={isLoading}
        exportName="bottleneck"
      />
    </>
  );
}
