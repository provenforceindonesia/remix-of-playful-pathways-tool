import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { handoverQuery, linesQuery, plantsQuery, shiftsQuery, workOrdersQuery } from "@/lib/queries";
import { formatDate, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/production/handover")({
  head: () => ({
    meta: [
      { title: "Handover Shift — MANUFACTUREIQ" },
      { name: "description", content: "Serah terima antar shift: ringkasan, isu tertunda, dan kondisi mesin." },
      { property: "og:title", content: "Handover Shift — MANUFACTUREIQ" },
      { property: "og:description", content: "Catatan serah terima antar shift produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HandoverPage,
});

type Row = Record<string, unknown>;

function HandoverPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(handoverQuery);
  const { data: shifts } = useQuery(shiftsQuery);
  const { data: lines } = useQuery(linesQuery);
  const { data: plants } = useQuery(plantsQuery);
  const { data: wos } = useQuery(workOrdersQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["SHOPFLOOR", "PPIC", "SYSADMIN"].includes(role ?? "");
  const shiftOptions = toOptions(shifts as Row[], ["name"]);

  const columns: Column<Row>[] = [
    { key: "handover_date", header: "Tanggal", render: (r) => formatDate(r.handover_date as string) },
    { key: "line", header: "Line", value: (r) => (r.lines as { name?: string } | null)?.name ?? "-" },
    {
      key: "from",
      header: "Dari Shift",
      value: (r) => (r.from_shift as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "to",
      header: "Ke Shift",
      value: (r) => (r.to_shift as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "wo",
      header: "Work Order",
      value: (r) => (r.work_orders as { wo_number?: string } | null)?.wo_number ?? "-",
    },
    { key: "summary", header: "Ringkasan" },
    { key: "pending_issues", header: "Isu Tertunda" },
  ];

  const fields: CrudField[] = [
    { name: "handover_date", label: "Tanggal", type: "date", required: true, defaultValue: toISODate(new Date()) },
    { name: "plant_id", label: "Plant", type: "select", options: toOptions(plants as Row[], ["name"]) },
    { name: "line_id", label: "Line", type: "select", options: toOptions(lines as Row[], ["name"]) },
    { name: "from_shift_id", label: "Dari Shift", type: "select", options: shiftOptions },
    { name: "to_shift_id", label: "Ke Shift", type: "select", options: shiftOptions },
    { name: "work_order_id", label: "Work Order", type: "select", options: toOptions(wos as Row[], ["wo_number"]) },
    { name: "summary", label: "Ringkasan Shift", type: "textarea", required: true, full: true },
    { name: "pending_issues", label: "Isu Tertunda", type: "textarea", full: true },
    { name: "machine_condition", label: "Kondisi Mesin", type: "textarea", full: true },
  ];

  return (
    <CrudPage<Row>
      title="Handover Shift"
      description="Dokumentasi serah terima agar shift berikutnya memahami kondisi produksi."
      table="handovers"
      invalidateKeys={[["handovers"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      exportName="handover"
      beforePayload={(v) => ({ ...v, created_by: profile?.id ?? null })}
    />
  );
}
