import { useState } from "react";
import { Layers, Plus, ShieldCheck, Timer } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { CrudPage } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { TimeStudyFormDialog } from "@/components/engineering/TimeStudyFormDialog";
import { Button } from "@/components/ui/button";
import { timeStudiesQuery } from "@/lib/queries";
import { formatDate, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/engineering/time-study")({
  head: () => ({
    meta: [
      {
        title: "Time Study — MANUFACTUREIQ",
      },
      {
        name: "description",
        content: "Pengukuran waktu siklus aktual proses produksi sebagai dasar standar kerja.",
      },
      {
        property: "og:title",
        content: "Time Study — MANUFACTUREIQ",
      },
      {
        property: "og:description",
        content: "Observasi cycle time dan validasi standar produksi.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
    ],
  }),
  component: TimeStudyPage,
});

type Row = Record<string, unknown>;

function num(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function TimeStudyPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery(timeStudiesQuery);

  const rows = (data ?? []) as Row[];
  const canWrite = ["IE", "SYSADMIN"].includes(role ?? "");
  const canValidate = ["PPIC", "SYSADMIN"].includes(role ?? "");

  const action = useMutation({
    mutationFn: async ({ kind, id }: { kind: "submit" | "validate" | "reject"; id: string }) => {
      if (kind === "submit") {
        const { error } = await supabase.rpc("submit_time_study", { p_time_study_id: id });
        if (error) throw new Error(error.message);
        return "Time Study dikirim untuk validasi";
      }
      if (kind === "validate") {
        const { error } = await supabase.rpc("validate_time_study", { p_time_study_id: id });
        if (error) throw new Error(error.message);
        return "Time Study tervalidasi dan standar diterapkan ke Routing";
      }
      const reason = window.prompt("Alasan revisi:");
      if (!reason?.trim()) throw new Error("Alasan revisi wajib diisi.");
      const { error } = await supabase.rpc("reject_time_study", { p_time_study_id: id, p_reason: reason.trim() });
      if (error) throw new Error(error.message);
      return "Time Study dikembalikan untuk revisi";
    },
    onSuccess: (message) => {
      toast.success(message);
      void queryClient.invalidateQueries({ queryKey: ["time_studies"] });
      void queryClient.invalidateQueries({ queryKey: ["routings"] });
      void queryClient.invalidateQueries({ queryKey: ["capacity_plans"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const validatedRows = rows.filter((row) => row.status === "Validated");

  const validated = validatedRows.length;

  const avgCt = validatedRows.length
    ? validatedRows.reduce((total, row) => total + num(row.standard_cycle_time_sec), 0) / validatedRows.length
    : 0;

  const columns: Column<Row>[] = [
    {
      key: "study_date",
      header: "Tanggal",
      render: (row) => formatDate(row.study_date as string),
    },
    {
      key: "product",
      header: "Produk",
      value: (row) =>
        (
          row.products as {
            name?: string;
          } | null
        )?.name ?? "-",
    },
    {
      key: "process_name",
      header: "Proses",
    },
    {
      key: "machine",
      header: "Mesin",
      value: (row) =>
        (
          row.machines as {
            code?: string;
            name?: string;
          } | null
        )?.code ?? "-",
    },
    {
      key: "observed_output",
      header: "Output Diamati",
      align: "right",
      render: (row) => formatNumber(num(row.observed_output)),
    },
    {
      key: "observed_minutes",
      header: "Menit Observasi",
      align: "right",
      render: (row) => formatNumber(num(row.observed_minutes), 1),
    },
    {
      key: "idle_time_min",
      header: "Idle (mnt)",
      align: "right",
      render: (row) => formatNumber(num(row.idle_time_min), 1),
    },
    {
      key: "manpower",
      header: "Manpower",
      align: "right",
      render: (row) => `${formatNumber(num(row.manpower))} orang`,
    },
    {
      key: "actual_cycle_time_sec",
      header: "Observed CT",
      align: "right",
      value: (row) => num(row.actual_cycle_time_sec),
      render: (row) => `${formatNumber(num(row.actual_cycle_time_sec), 2)} dtk`,
    },
    {
      key: "standard_cycle_time_sec",
      header: "Standard CT",
      align: "right",
      value: (row) => num(row.standard_cycle_time_sec),
      render: (row) => `${formatNumber(num(row.standard_cycle_time_sec), 2)} dtk`,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={String(row.status ?? "-")} />,
    },
  ];

  return (
    <>
      <CrudPage<Row>
        title="Time Study"
        description="Observasi setiap operasi routing untuk menetapkan setup time dan cycle time standar."
        table="time_studies"
        invalidateKeys={[["time_studies"]]}
        columns={columns}
        rows={rows}
        loading={isLoading}
        fields={[]}
        canWrite={false}
        canDelete={false}
        exportName="time-study"
        headerActions={
          canWrite ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Tambah Time Study
            </Button>
          ) : null
        }
      >
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <KpiCard icon={<Layers className="size-4" />} label="Total Studi" value={rows.length} tone="primary" />

          <KpiCard icon={<ShieldCheck className="size-4" />} label="Tervalidasi" value={validated} tone="success" />

          <KpiCard
            icon={<Timer className="size-4" />}
            label="Rata-rata Standard Cycle Time"
            value={`${formatNumber(avgCt, 2)} dtk`}
            tone="info"
          />
        </div>
      </CrudPage>

      <TimeStudyFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </>
  );
}
