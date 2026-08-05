import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { productionPlansQuery } from "@/lib/queries";
import { formatDate, formatFullDateTime, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { ProductionPlanDialog } from "@/components/production/ProductionPlanDialog";

export const Route = createFileRoute("/_authenticated/production/plans")({
  head: () => ({
    meta: [
      { title: "Production Plan — MANUFACTUREIQ" },
      {
        name: "description",
        content: "Rencana produksi multi-produk per Sales Order beserta line, mesin, shift, dan kesiapan.",
      },
      { property: "og:title", content: "Production Plan — MANUFACTUREIQ" },
      { property: "og:description", content: "Perencanaan produksi multi-produk pabrik." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlansPage,
});

type Row = Record<string, unknown>;

const STATUS_LABEL: Record<string, string> = {
  Draft: "Draft",
  Released: "Dirilis",
  "Partially Scheduled": "Sebagian Dijadwalkan",
  "Fully Scheduled": "Terjadwal Penuh",
  Completed: "Selesai",
  Cancelled: "Dibatalkan",
};

const rel = (r: Row | null | undefined, key: string) =>
  r && r[key] != null ? String(r[key]) : "-";

function items(row: Row) {
  return (row.production_plan_items ?? []) as Row[];
}

/** Merender satu subbaris per produk agar kolom antarproduk tetap sejajar. */
function Stacked({ row, render }: { row: Row; render: (it: Row) => React.ReactNode }) {
  const list = items(row);
  if (!list.length) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="divide-y divide-border/60">
      {list.map((it) => (
        <div key={String(it.id)} className="py-1.5 first:pt-0 last:pb-0">
          {render(it)}
        </div>
      ))}
    </div>
  );
}

function PlansPage() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const { data, isLoading } = useQuery(productionPlansQuery);
  const rows = (data ?? []) as Row[];
  const canWrite = ["PPIC", "SYSADMIN"].includes(role ?? "");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const remove = async (row: Row) => {
    const { error } = await db
      .from("production_plans")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", String(row.id));
    if (error) {
      toast.error("Gagal menghapus", { description: error.message });
      return;
    }
    toast.success("Production Plan dihapus");
    void qc.invalidateQueries({ queryKey: ["production_plans"] });
  };

  const columns: Column<Row>[] = [
    { key: "plan_number", header: "No. Plan" },
    {
      key: "so",
      header: "Sales Order",
      value: (r) => rel(r.sales_orders as Row, "so_number"),
    },
    {
      key: "produk",
      header: "Produk/Varian",
      render: (r) => (
        <Stacked
          row={r}
          render={(it) => (
            <span>
              {rel(it.products as Row, "name")} — {rel(it.product_variants as Row, "name")}
            </span>
          )}
        />
      ),
      value: (r) =>
        items(r)
          .map((it) => rel(it.products as Row, "name"))
          .join(", "),
    },
    {
      key: "qty_so",
      header: "Quantity SO",
      align: "right",
      render: (r) => (
        <Stacked
          row={r}
          render={(it) =>
            `${formatNumber(Number(it.demand_qty ?? 0))} ${rel(it.units_of_measure as Row, "code")}`
          }
        />
      ),
    },
    {
      key: "target",
      header: "Target Plan",
      align: "right",
      render: (r) => (
        <Stacked
          row={r}
          render={(it) =>
            `${formatNumber(Number(it.target_qty ?? 0))} ${rel(it.units_of_measure as Row, "code")}`
          }
        />
      ),
    },
    {
      key: "tanggal_shift",
      header: "Tanggal Produksi/Shift",
      render: (r) => (
        <Stacked
          row={r}
          render={(it) =>
            `${formatDate(it.planned_date as string)} / ${rel(it.shifts as Row, "name")}`
          }
        />
      ),
    },
    {
      key: "line_mesin",
      header: "Line/Mesin",
      render: (r) => (
        <Stacked
          row={r}
          render={(it) => `${rel(it.lines as Row, "name")} / ${rel(it.machines as Row, "code")}`}
        />
      ),
    },
    {
      key: "routing",
      header: "Routing",
      render: (r) => (
        <Stacked
          row={r}
          render={(it) => (
            <div>
              <div>{rel(it.routings as Row, "code")}</div>
              {it.routing_id ? (
                <div className="text-xs text-muted-foreground">Routing Utama</div>
              ) : null}
            </div>
          )}
        />
      ),
    },
    {
      key: "manpower",
      header: "Manpower",
      render: (r) => (
        <Stacked
          row={r}
          render={(it) => (
            <div>
              <div>{formatNumber(Number(it.planned_manpower ?? 0))} orang</div>
              {it.recommended_manpower ? (
                <div className="text-xs text-muted-foreground">
                  Rekomendasi: {formatNumber(Number(it.recommended_manpower))} orang
                </div>
              ) : null}
            </div>
          )}
        />
      ),
    },
    {
      key: "kesiapan",
      header: "Kesiapan",
      render: (r) => (
        <Stacked
          row={r}
          render={(it) => (
            <div className="flex flex-wrap gap-1">
              <StatusBadge status={String(it.material_readiness ?? "-")} />
              <StatusBadge status={String(it.capacity_readiness ?? "-")} />
            </div>
          )}
        />
      ),
    },
    {
      key: "created_at",
      header: "Dibuat",
      render: (r) => formatFullDateTime(r.created_at as string),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={STATUS_LABEL[String(r.status ?? "")] ?? String(r.status ?? "-")} />,
    },
    {
      key: "__actions",
      header: "Aksi",
      align: "right",
      sortable: false,
      render: (r) => {
        const status = String(r.status ?? "Draft");
        return (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => {
                setEditing(r);
                setOpen(true);
              }}>
              <Eye className="size-4" />
            </Button>
            {canWrite && status === "Draft" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => {
                    setEditing(r);
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => void remove(r)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
            {canWrite && status === "Released" && (
              <Button variant="outline" size="sm">
                Buat Work Order
              </Button>
            )}
            {canWrite && status === "Partially Scheduled" && (
              <Button variant="outline" size="sm">
                Lanjutkan Work Order
              </Button>
            )}
            {canWrite && status === "Fully Scheduled" && (
              <Button variant="outline" size="sm">
                Lihat Work Order
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Production Plan"
        description="Rencana produksi per produk menjadi dasar penerbitan work order."
      />

      <DataTable<Row>
        columns={columns}
        rows={rows}
        loading={isLoading}
        toolbarActions={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="size-4" /> Tambah
            </Button>
          ) : null
        }
      />

      <ProductionPlanDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
      />
    </>
  );
}
