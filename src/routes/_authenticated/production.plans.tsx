import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { linesQuery, plantsQuery, productionPlansQuery, salesOrdersQuery } from "@/lib/queries";
import { formatDate, formatFullDateTime, formatNumber, toISODate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/production/plans")({
  head: () => ({
    meta: [
      { title: "Production Plan — MANUFACTUREIQ" },
      {
        name: "description",
        content: "Rencana produksi harian per line dan shift beserta kesiapan material.",
      },
      { property: "og:title", content: "Production Plan — MANUFACTUREIQ" },
      { property: "og:description", content: "Perencanaan produksi harian pabrik." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlansPage,
});

type Row = Record<string, unknown>;

type WorkOrderSchedule = {
  production_date?: string | null;
  shift_id?: string | null;
  planned_manpower?: number | string | null;
};

type PlanWorkOrder = {
  work_order_schedules?: WorkOrderSchedule[] | null;
};

type SalesOrderItem = {
  id: string;
  product_id: string;
  variant_id?: string | null;
  uom_id?: string | null;
  quantity: number | string;
  products?: { code?: string; name?: string } | null;
  product_variants?: { name?: string } | null;
  units_of_measure?: { code?: string } | null;
};

type SalesOrder = Row & {
  id: string;
  so_number?: string;
  sales_order_items?: SalesOrderItem[] | null;
};

type PlanItemInput = {
  sales_order_item_id: string;
  product_id: string;
  variant_id: string | null;
  uom_id: string | null;
  product_name: string;
  variant_name: string;
  uom_code: string;
  demand_qty: number;
  already_planned_qty: number;
  max_target_qty: number;
  target_qty: number;
};

type StoredPlanItem = {
  product_id?: string | null;
  variant_id?: string | null;
  uom_id?: string | null;
  demand_qty?: number | string | null;
  target_qty?: number | string | null;
  products?: { name?: string } | null;
  product_variants?: { name?: string } | null;
  units_of_measure?: { code?: string } | null;
};

const numberValue = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const itemKey = (productId: unknown, variantId: unknown, uomId: unknown) =>
  `${String(productId ?? "")}:${String(variantId ?? "")}:${String(uomId ?? "")}`;

function getNextPlanNumber(rows: Row[]): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastSequence = rows.reduce((highest, row) => {
    const match = String(row.plan_number ?? "").match(/^PP-\d{4}-(\d+)$/);
    return Math.max(highest, match ? Number(match[1]) : 0);
  }, 0);

  return `PP-${year}${month}-${String(lastSequence + 1).padStart(4, "0")}`;
}

/**
 * Menampilkan kebutuhan manpower puncak dalam satu tanggal dan shift.
 * Jadwal pada tanggal/shift berbeda tidak dijumlahkan karena tidak berjalan
 * secara bersamaan.
 */
function getPeakPlannedManpower(row: Row): number | null {
  const workOrders = (row.work_orders ?? []) as PlanWorkOrder[];
  const manpowerBySchedule = new Map<string, number>();

  for (const workOrder of workOrders) {
    for (const schedule of workOrder.work_order_schedules ?? []) {
      const manpower = Number(schedule.planned_manpower ?? 0);
      if (!Number.isFinite(manpower) || manpower <= 0) continue;

      const scheduleKey = `${schedule.production_date ?? "tanpa-tanggal"}:${schedule.shift_id ?? "tanpa-shift"}`;
      manpowerBySchedule.set(scheduleKey, (manpowerBySchedule.get(scheduleKey) ?? 0) + manpower);
    }
  }

  if (manpowerBySchedule.size === 0) return null;
  return Math.max(...manpowerBySchedule.values());
}

function PlansPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(productionPlansQuery);
  const { data: sos } = useQuery(salesOrdersQuery);
  const { data: plants } = useQuery(plantsQuery);
  const { data: lines } = useQuery(linesQuery);
  const rows = (data ?? []) as Row[];
  const salesOrders = (sos ?? []) as SalesOrder[];
  const canWrite = ["PPIC", "SYSADMIN"].includes(role ?? "");

  const buildPlanItems = (salesOrderId: string, currentPlanId?: string): PlanItemInput[] => {
    const salesOrder = salesOrders.find((so) => String(so.id) === salesOrderId);
    if (!salesOrder) return [];

    const plannedByItem = new Map<string, number>();
    for (const plan of rows) {
      if (String(plan.sales_order_id ?? "") !== salesOrderId) continue;
      if (currentPlanId && String(plan.id ?? "") === currentPlanId) continue;
      if (String(plan.status ?? "") === "Cancelled") continue;

      for (const item of (plan.production_plan_items ?? []) as StoredPlanItem[]) {
        const key = itemKey(item.product_id, item.variant_id, item.uom_id);
        plannedByItem.set(key, (plannedByItem.get(key) ?? 0) + numberValue(item.target_qty));
      }
    }

    return (salesOrder.sales_order_items ?? []).map((item) => {
      const key = itemKey(item.product_id, item.variant_id, item.uom_id);
      const demandQty = numberValue(item.quantity);
      const alreadyPlannedQty = plannedByItem.get(key) ?? 0;
      const maxTargetQty = Math.max(0, demandQty - alreadyPlannedQty);

      return {
        sales_order_item_id: String(item.id),
        product_id: String(item.product_id),
        variant_id: item.variant_id ? String(item.variant_id) : null,
        uom_id: item.uom_id ? String(item.uom_id) : null,
        product_name: item.products?.name ?? "Produk",
        variant_name: item.product_variants?.name ?? "-",
        uom_code: item.units_of_measure?.code ?? "unit",
        demand_qty: demandQty,
        already_planned_qty: alreadyPlannedQty,
        max_target_qty: maxTargetQty,
        target_qty: maxTargetQty,
      };
    });
  };

  const columns: Column<Row>[] = [
    { key: "plan_number", header: "No. Plan" },
    {
      key: "so",
      header: "Sales Order",
      value: (r) => (r.sales_orders as { so_number?: string } | null)?.so_number ?? "-",
    },
    {
      key: "production_date",
      header: "Jadwal Produksi",
      render: (r) => formatDate(r.production_date as string),
    },
    {
      key: "line",
      header: "Line",
      value: (r) => (r.lines as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "material_readiness",
      header: "Material",
      render: (r) => <StatusBadge status={String(r.material_readiness ?? "-")} />,
    },
    {
      key: "capacity_readiness",
      header: "Kapasitas",
      render: (r) => <StatusBadge status={String(r.capacity_readiness ?? "-")} />,
    },
    {
      key: "planned_manpower",
      header: "Kebutuhan Manpower",
      align: "right",
      value: (r) => getPeakPlannedManpower(r) ?? 0,
      render: (r) => {
        const manpower = getPeakPlannedManpower(r);
        return manpower === null ? "Belum dijadwalkan" : `${formatNumber(manpower)} orang`;
      },
    },
    {
      key: "created_at",
      header: "Dibuat",
      render: (r) => formatFullDateTime(r.created_at as string),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={String(r.status ?? "-")} />,
    },
  ];

  const readiness = ["Siap", "Sebagian", "Tidak Siap", "Belum Dicek"].map((v) => ({
    value: v,
    label: v,
  }));

  const fields: CrudField[] = [
    {
      name: "plan_number",
      label: "Nomor Plan",
      readOnly: true,
      virtual: true,
      defaultValue: getNextPlanNumber(rows),
    },
    {
      name: "sales_order_id",
      label: "Sales Order",
      type: "select",
      required: true,
      options: toOptions(salesOrders, ["so_number"]),
    },
    {
      name: "plan_items",
      label: "Item Sales Order",
      type: "custom",
      virtual: true,
      full: true,
      render: ({ value, setValue }) => {
        const items = (value ?? []) as PlanItemInput[];

        if (items.length === 0) {
          return (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Pilih Sales Order untuk menampilkan produk yang harus direncanakan.
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.sales_order_item_id} className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">Varian: {item.variant_name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Sisa {formatNumber(item.max_target_qty)} {item.uom_code}
                  </span>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Quantity SO</p>
                    <p>
                      {formatNumber(item.demand_qty)} {item.uom_code}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sudah Direncanakan</p>
                    <p>
                      {formatNumber(item.already_planned_qty)} {item.uom_code}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Belum Direncanakan</p>
                    <p>
                      {formatNumber(item.max_target_qty)} {item.uom_code}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Target Plan</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={item.max_target_qty}
                        step="any"
                        value={item.target_qty}
                        onChange={(event) => {
                          const next = [...items];
                          next[index] = { ...item, target_qty: numberValue(event.target.value) };
                          setValue(next);
                        }}
                      />
                      <span className="text-xs text-muted-foreground">{item.uom_code}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      name: "plant_id",
      label: "Plant",
      type: "select",
      options: toOptions(plants as Row[], ["name"]),
    },
    {
      name: "line_id",
      label: "Line",
      type: "select",
      options: toOptions(lines as Row[], ["name"]),
    },
    {
      name: "production_date",
      label: "Tanggal Produksi",
      type: "date",
      required: true,
      defaultValue: toISODate(new Date()),
    },
    {
      name: "material_readiness",
      label: "Kesiapan Material",
      type: "select",
      options: readiness,
      defaultValue: "Belum Dicek",
    },
    {
      name: "capacity_readiness",
      label: "Kesiapan Kapasitas",
      type: "select",
      options: readiness,
      defaultValue: "Belum Dicek",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "Draft",
      options: ["Draft", "Review", "Released", "Partially Scheduled", "Fully Scheduled", "Completed", "Cancelled"].map(
        (v) => ({ value: v, label: v }),
      ),
    },
  ];

  return (
    <CrudPage<Row>
      title="Production Plan"
      description="Rencana produksi menjadi dasar penerbitan work order."
      table="production_plans"
      invalidateKeys={[["production_plans"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite={canWrite}
      canDelete={canWrite}
      softDelete
      exportName="production-plan"
      onFieldChange={(name, value) => {
        if (name !== "sales_order_id") return {};
        return { plan_items: buildPlanItems(String(value ?? "")) };
      }}
      toRowValues={(row) => {
        const existingItems = (row.production_plan_items ?? []) as StoredPlanItem[];
        const availableItems = buildPlanItems(String(row.sales_order_id ?? ""), String(row.id ?? ""));

        return {
          ...row,
          plan_items: availableItems.map((available) => {
            const stored = existingItems.find(
              (item) =>
                itemKey(item.product_id, item.variant_id, item.uom_id) ===
                itemKey(available.product_id, available.variant_id, available.uom_id),
            );
            return { ...available, target_qty: numberValue(stored?.target_qty) };
          }),
        };
      }}
      beforePayload={(values) => {
        const salesOrderId = String(values.sales_order_id ?? "").trim();
        const items = (values.plan_items ?? []) as PlanItemInput[];
        const selectedItems = items.filter((item) => numberValue(item.target_qty) > 0);

        if (!salesOrderId) throw new Error("Sales Order wajib dipilih.");
        if (selectedItems.length === 0) throw new Error("Isi minimal satu target Production Plan.");

        for (const item of selectedItems) {
          if (numberValue(item.target_qty) > numberValue(item.max_target_qty)) {
            throw new Error(`Target ${item.product_name} melebihi sisa quantity yang belum direncanakan.`);
          }
        }

        return { ...values, created_by: profile?.id ?? null };
      }}
      afterCreate={async (created, values) => {
        const items = ((values.plan_items ?? []) as PlanItemInput[]).filter((item) => numberValue(item.target_qty) > 0);
        const { error } = await db.from("production_plan_items").insert(
          items.map((item) => ({
            plan_id: String(created.id),
            product_id: item.product_id,
            variant_id: item.variant_id,
            uom_id: item.uom_id,
            demand_qty: item.demand_qty,
            target_qty: numberValue(item.target_qty),
          })),
        );
        if (error) throw new Error(`Production Plan tersimpan, tetapi item gagal disimpan: ${error.message}`);
      }}
      afterUpdate={async (updated, values) => {
        const planId = String(updated.id);
        const items = ((values.plan_items ?? []) as PlanItemInput[]).filter((item) => numberValue(item.target_qty) > 0);

        const { error: deleteError } = await db.from("production_plan_items").delete().eq("plan_id", planId);
        if (deleteError) throw new Error(deleteError.message);

        const { error: insertError } = await db.from("production_plan_items").insert(
          items.map((item) => ({
            plan_id: planId,
            product_id: item.product_id,
            variant_id: item.variant_id,
            uom_id: item.uom_id,
            demand_qty: item.demand_qty,
            target_qty: numberValue(item.target_qty),
          })),
        );
        if (insertError) throw new Error(insertError.message);
      }}
    />
  );
}
