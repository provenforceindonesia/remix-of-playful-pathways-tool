import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GitBranch, Layers, Plus, ShieldCheck } from "lucide-react";

import { CrudPage } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KpiCard } from "@/components/common/KpiCard";
import { RoutingFormDialog } from "@/components/engineering/RoutingFormDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { routingsQuery } from "@/lib/queries";
import { formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/engineering/routing")({
  head: () => ({
    meta: [
      { title: "Routing & Standard — MANUFACTUREIQ" },
      {
        name: "description",
        content: "Menetapkan urutan proses, mesin, setup time, cycle time, dan manpower standard untuk setiap produk.",
      },
      { property: "og:title", content: "Routing & Standard — MANUFACTUREIQ" },
      { property: "og:description", content: "Master routing dan standar proses produksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoutingPage,
});

type Row = Record<string, unknown>;
type Op = {
  id: string;
  seq: number;
  operation_name: string;
  standard_cycle_time_sec: number;
  setup_time_min: number;
  manpower: number;
  standard_source?: string | null;
  machines?: { code?: string; name?: string } | null;
};

function ops(row: Row | null | undefined): Op[] {
  return (((row?.routing_operations as Op[]) ?? []) as Op[]).slice().sort((a, b) => a.seq - b.seq);
}

function routingVersion(row: Row): string {
  return (
    String(row.code ?? "").match(/REV-\d+/i)?.[0]?.toUpperCase() ??
    `REV-${String(row.version ?? 1).padStart(2, "0")}`
  );
}

function RoutingPage() {
  const { role } = useAuth();
  const { data, isLoading } = useQuery(routingsQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["IE", "SYSADMIN"].includes(role ?? "");

  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [viewRow, setViewRow] = useState<Row | null>(null);

  const activeCount = rows.filter((r) => String(r.status ?? "") === "Active").length;
  const totalSteps = rows.reduce((total, r) => total + ops(r).length, 0);

  const columns: Column<Row>[] = [
    {
      key: "product",
      header: "Produk",
      value: (r) => (r.products as { name?: string } | null)?.name ?? "-",
    },
    { key: "code", header: "Routing Version", value: (r) => routingVersion(r) },
    { key: "steps", header: "Total Step", align: "right", value: (r) => ops(r).length },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status ?? "-")} /> },
  ];

  return (
    <>
      <CrudPage<Row>
        title="Routing & Standard"
        description="Menetapkan urutan proses, mesin, setup time, cycle time, dan manpower standard untuk setiap produk."
        table="routings"
        invalidateKeys={[["routings"]]}
        columns={columns}
        rows={rows}
        loading={isLoading}
        fields={[]}
        canWrite={false}
        canDelete={false}
        exportName="routing"
        headerActions={
          canWrite ? (
            <Button
              onClick={() => {
                setEditRow(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Tambah Routing
            </Button>
          ) : null
        }
        rowActions={(row) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setViewRow(row);
              }}
            >
              Lihat
            </Button>
            {canWrite && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditRow(row);
                  setFormOpen(true);
                }}
              >
                Ubah
              </Button>
            )}
          </div>
        )}
      >
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <KpiCard icon={<GitBranch className="size-4" />} label="Total Routing" value={rows.length} tone="primary" />
          <KpiCard icon={<ShieldCheck className="size-4" />} label="Routing Active" value={activeCount} tone="success" />
          <KpiCard icon={<Layers className="size-4" />} label="Total Routing Step" value={totalSteps} tone="info" />
        </div>
      </CrudPage>

      <RoutingFormDialog open={formOpen} onOpenChange={setFormOpen} routing={editRow} />

      <Dialog open={Boolean(viewRow)} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {(viewRow?.products as { name?: string } | null)?.name ?? "Routing"} ·{" "}
              {viewRow ? routingVersion(viewRow) : ""}
            </DialogTitle>
            <DialogDescription>Urutan proses beserta standar waktu dan manpower.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {ops(viewRow).length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Belum ada step routing.
              </p>
            ) : (
              ops(viewRow).map((op) => (
                <div key={op.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">
                    {op.seq}. {op.operation_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {op.machines?.code ?? "-"} · setup {formatNumber(op.setup_time_min)} mnt · CT{" "}
                    {formatNumber(op.standard_cycle_time_sec, 2)} dtk/pcs · {op.manpower} orang
                    {op.standard_source ? ` · sumber ${op.standard_source}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
