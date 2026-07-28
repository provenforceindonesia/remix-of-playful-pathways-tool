import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CrudPage, selectOptions, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { lossQuery, workOrdersQuery } from "@/lib/queries";
import { formatCurrency, formatDate, formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/costing/loss")({
  head: () => ({
    meta: [
      { title: "Loss Valuation — MANUFACTUREIQ" },
      { name: "description", content: "Nilai kerugian produksi dari reject, rework, waste material, dan downtime." },
      { property: "og:title", content: "Loss Valuation — MANUFACTUREIQ" },
      { property: "og:description", content: "Kuantifikasi kerugian produksi dalam rupiah." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LossPage,
});

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function LossPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(lossQuery);
  const { data: wos } = useQuery(workOrdersQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["FINANCE", "SYSADMIN"].includes(role ?? "");

  const totalLoss = rows.reduce((s, r) => s + num(r.loss_value), 0);
  const validated = rows.filter((r) => r.status === "Tervalidasi");
  const validatedLoss = validated.reduce((s, r) => s + num(r.loss_value), 0);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const k = String(r.loss_type ?? "-");
      map.set(k, (map.get(k) ?? 0) + num(r.loss_value));
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const columns: Column<Row>[] = [
    { key: "period_date", header: "Periode", render: (r) => formatDate(r.period_date as string) },
    {
      key: "wo",
      header: "Work Order",
      value: (r) => (r.work_orders as { wo_number?: string } | null)?.wo_number ?? "-",
    },
    { key: "loss_type", header: "Jenis Loss", render: (r) => <StatusBadge status={String(r.loss_type ?? "-")} /> },
    { key: "quantity", header: "Qty", align: "right", render: (r) => formatNumber(num(r.quantity), 2) },
    {
      key: "unit_value",
      header: "Nilai Satuan",
      align: "right",
      value: (r) => num(r.unit_value),
      render: (r) => formatCurrency(num(r.unit_value)),
    },
    {
      key: "loss_value",
      header: "Total Loss",
      align: "right",
      value: (r) => num(r.loss_value),
      render: (r) => formatCurrency(num(r.loss_value)),
    },
    { key: "method", header: "Metode" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  const fields: CrudField[] = [
    { name: "period_date", label: "Periode", type: "date", required: true, defaultValue: toISODate(new Date()) },
    { name: "work_order_id", label: "Work Order", type: "select", options: toOptions(wos as Row[], ["wo_number"]) },
    {
      name: "loss_type",
      label: "Jenis Loss",
      type: "select",
      required: true,
      options: selectOptions(["Reject", "Rework", "Waste Material", "Downtime", "Speed Loss"]),
      defaultValue: "Reject",
    },
    { name: "quantity", label: "Kuantitas", type: "number", step: "0.01", required: true, defaultValue: 0 },
    { name: "unit_value", label: "Nilai per Unit", type: "number", required: true, defaultValue: 0 },
    { name: "loss_value", label: "Total Nilai Loss", type: "number", required: true, defaultValue: 0 },
    {
      name: "method",
      label: "Metode Perhitungan",
      type: "select",
      options: selectOptions(["Standard HPP", "Actual Cost", "Material Only"]),
      defaultValue: "Standard HPP",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: selectOptions(["Draft", "Tervalidasi"]),
      defaultValue: "Draft",
    },
  ];

  return (
    <CrudPage<Row>
      title="Loss Valuation"
      description="Konversi kerugian produksi menjadi nilai rupiah untuk analisis dampak finansial."
      table="loss_valuations"
      invalidateKeys={[["loss_valuations"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      exportName="loss-valuation"
      beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null })}
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total Loss" value={formatCurrency(totalLoss)} tone="danger" />
        <KpiCard label="Loss Tervalidasi" value={formatCurrency(validatedLoss)} tone="warning" />
        <KpiCard label="Catatan Loss" value={rows.length} tone="primary" />
      </div>
      {byType.length > 0 && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Loss per Jenis</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </CrudPage>
  );
}
