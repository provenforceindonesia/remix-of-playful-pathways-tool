import { Wallet } from "lucide-react";
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
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { actualCostsQuery, hppQuery, lossQuery } from "@/lib/queries";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/costing/hpp")({
  head: () => ({
    meta: [
      { title: "HPP & Costing — MANUFACTUREIQ" },
      { name: "description", content: "Bandingkan HPP standar dengan biaya aktual produksi dan nilai kerugian." },
      { property: "og:title", content: "HPP & Costing — MANUFACTUREIQ" },
      { property: "og:description", content: "Analisis biaya produksi standar vs aktual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CostingPage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

type Detail = {
  id: string;
  material_cost: number;
  machine_cost: number;
  labor_cost: number;
  overhead_cost: number;
  hpp_per_unit: number;
  rework_cost_per_unit: number;
  contribution_margin_per_unit: number;
  products?: { code?: string; name?: string } | null;
  product_variants?: { name?: string } | null;
};

function CostingPage() {
  const { data: versions, isLoading } = useQuery(hppQuery);
  const { data: actuals } = useQuery(actualCostsQuery);
  const { data: losses } = useQuery(lossQuery);

  const versionRows = (versions ?? []) as Row[];
  const actualRows = (actuals ?? []) as Row[];
  const lossRows = (losses ?? []) as Row[];

  const activeVersion =
    versionRows.find((v) => v.status === "Aktif" || v.status === "Active") ?? versionRows[0];
  const details = ((activeVersion?.standard_hpp_details as Detail[]) ?? []) as Detail[];

  const chart = useMemo(
    () =>
      details.slice(0, 10).map((d) => ({
        name: d.products?.code ?? "-",
        material: num(d.material_cost),
        machine: num(d.machine_cost),
        labor: num(d.labor_cost),
        overhead: num(d.overhead_cost),
      })),
    [details],
  );

  const totalActual = actualRows.reduce((s, r) => s + num(r.total_cost), 0);
  const totalGood = actualRows.reduce((s, r) => s + num(r.good_output), 0);
  const actualPerUnit = totalGood ? totalActual / totalGood : 0;
  const avgStandard = details.length
    ? details.reduce((s, d) => s + num(d.hpp_per_unit), 0) / details.length
    : 0;
  const totalLoss = lossRows.reduce((s, r) => s + num(r.loss_value), 0);

  const standardColumns: Column<Row>[] = [
    { key: "product", header: "Produk", value: (r) => (r.products as { name?: string } | null)?.name ?? "-" },
    { key: "variant", header: "Varian", value: (r) => (r.product_variants as { name?: string } | null)?.name ?? "-" },
    { key: "material_cost", header: "Material", align: "right", render: (r) => formatCurrency(num(r.material_cost)) },
    { key: "machine_cost", header: "Mesin", align: "right", render: (r) => formatCurrency(num(r.machine_cost)) },
    { key: "labor_cost", header: "Tenaga Kerja", align: "right", render: (r) => formatCurrency(num(r.labor_cost)) },
    { key: "overhead_cost", header: "Overhead", align: "right", render: (r) => formatCurrency(num(r.overhead_cost)) },
    { key: "hpp_per_unit", header: "HPP / Unit", align: "right", render: (r) => formatCurrency(num(r.hpp_per_unit)) },
    {
      key: "contribution_margin_per_unit",
      header: "Margin / Unit",
      align: "right",
      render: (r) => formatCurrency(num(r.contribution_margin_per_unit)),
    },
  ];

  const actualColumns: Column<Row>[] = [
    { key: "period_date", header: "Periode", render: (r) => formatDate(r.period_date as string) },
    {
      key: "wo",
      header: "Work Order",
      value: (r) => (r.work_orders as { wo_number?: string } | null)?.wo_number ?? "-",
    },
    { key: "actual_material_cost", header: "Material", align: "right", render: (r) => formatCurrency(num(r.actual_material_cost)) },
    { key: "machine_cost", header: "Mesin", align: "right", render: (r) => formatCurrency(num(r.machine_cost)) },
    { key: "labor_cost", header: "Tenaga Kerja", align: "right", render: (r) => formatCurrency(num(r.labor_cost)) },
    { key: "overhead_cost", header: "Overhead", align: "right", render: (r) => formatCurrency(num(r.overhead_cost)) },
    { key: "rework_cost", header: "Rework", align: "right", render: (r) => formatCurrency(num(r.rework_cost)) },
    { key: "total_cost", header: "Total", align: "right", render: (r) => formatCurrency(num(r.total_cost)) },
    { key: "good_output", header: "Good Output", align: "right", render: (r) => formatNumber(num(r.good_output)) },
    {
      key: "per_unit",
      header: "Biaya / Unit",
      align: "right",
      value: (r) => (num(r.good_output) ? num(r.total_cost) / num(r.good_output) : 0),
      render: (r) =>
        formatCurrency(num(r.good_output) ? num(r.total_cost) / num(r.good_output) : 0),
    },
  ];

  const lossColumns: Column<Row>[] = [
    { key: "period_date", header: "Periode", render: (r) => formatDate(r.period_date as string) },
    {
      key: "wo",
      header: "Work Order",
      value: (r) => (r.work_orders as { wo_number?: string } | null)?.wo_number ?? "-",
    },
    { key: "loss_type", header: "Jenis", render: (r) => <StatusBadge status={String(r.loss_type ?? "-")} /> },
    { key: "quantity", header: "Qty", align: "right", render: (r) => formatNumber(num(r.quantity), 2) },
    { key: "unit_value", header: "Nilai Satuan", align: "right", render: (r) => formatCurrency(num(r.unit_value)) },
    { key: "loss_value", header: "Nilai Kerugian", align: "right", render: (r) => formatCurrency(num(r.loss_value)) },
    { key: "method", header: "Metode" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  return (
    <>
      <PageHeader
        title="HPP & Costing"
        description={`Versi HPP aktif: ${String(activeVersion?.version_code ?? "-")}`}
      />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <KpiCard icon={<Wallet className="size-4" />} label="HPP Standar / Unit" value={formatCurrency(avgStandard)} tone="primary" />
        <KpiCard icon={<Wallet className="size-4" />} label="Biaya Aktual / Unit" value={formatCurrency(actualPerUnit)} tone="info" />
        <KpiCard icon={<Wallet className="size-4" />}
          label="Varian Biaya"
          value={formatCurrency(actualPerUnit - avgStandard)}
          tone={actualPerUnit > avgStandard ? "danger" : "success"}
        />
        <KpiCard icon={<Wallet className="size-4" />} label="Total Kerugian" value={formatCurrency(totalLoss)} tone="warning" />
      </div>

      <Card className="mb-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Komposisi HPP Standar per Produk</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="material" name="Material" stackId="a" fill="var(--color-primary)" />
              <Bar dataKey="machine" name="Mesin" stackId="a" fill="var(--color-info)" />
              <Bar dataKey="labor" name="Tenaga Kerja" stackId="a" fill="var(--color-warning)" />
              <Bar dataKey="overhead" name="Overhead" stackId="a" fill="var(--color-purple)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="standard">
        <TabsList>
          <TabsTrigger value="standard">HPP Standar</TabsTrigger>
          <TabsTrigger value="actual">Biaya Aktual</TabsTrigger>
          <TabsTrigger value="loss">Loss Valuation</TabsTrigger>
        </TabsList>
        <TabsContent value="standard" className="mt-4">
          <DataTable<Row>
            columns={standardColumns}
            rows={details as unknown as Row[]}
            loading={isLoading}
            exportName="hpp-standar"
          />
        </TabsContent>
        <TabsContent value="actual" className="mt-4">
          <DataTable<Row> columns={actualColumns} rows={actualRows} exportName="biaya-aktual" />
        </TabsContent>
        <TabsContent value="loss" className="mt-4">
          <DataTable<Row> columns={lossColumns} rows={lossRows} exportName="loss-valuation" />
        </TabsContent>
      </Tabs>
    </>
  );
}
