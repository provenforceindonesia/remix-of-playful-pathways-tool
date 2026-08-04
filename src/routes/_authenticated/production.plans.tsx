import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  linesQuery,
  machinesQuery,
  plantsQuery,
  productionPlansQuery,
  routingsQuery,
  salesOrdersQuery,
  shiftsQuery,
} from "@/lib/queries";
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
  planned_date: string;
  line_id: string;
  machine_id: string;
  shift_id: string;
  routing_id: string;
  available_minutes: number;
  recommended_manpower: number;
  planned_manpower: number;
  manpower_override_reason: string;
  material_readiness: string;
  capacity_readiness: string;
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
  planned_date?: string | null;
  line_id?: string | null;
  machine_id?: string | null;
  shift_id?: string | null;
  routing_id?: string | null;
  available_minutes?: number | string | null;
  recommended_manpower?: number | string | null;
  planned_manpower?: number | string | null;
  manpower_override_reason?: string | null;
  material_readiness?: string | null;
  capacity_readiness?: string | null;
  lines?: { name?: string } | null;
  machines?: { code?: string; name?: string } | null;
  shifts?: { name?: string } | null;
  routings?: { code?: string } | null;
};

function getPlanItems(row: Row): StoredPlanItem[] {
  return (row.production_plan_items ?? []) as StoredPlanItem[];
}

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

function shiftMinutes(shift: Row | undefined) {
  if (!shift) return 0;
  const [startHour, startMinute] = String(shift.start_time ?? "00:00")
    .split(":")
    .map(Number);
  const [endHour, endMinute] = String(shift.end_time ?? "00:00")
    .split(":")
    .map(Number);
  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;
  if (end <= start) end += 1440;
  return Math.max(end - start - numberValue(shift.break_minutes), 0);
}

function ItemRows({ children }: { children: ReactNode }) {
  return <div className="min-w-32 divide-y divide-border/70">{children}</div>;
}

function ItemRow({ children }: { children: ReactNode }) {
  return <div className="flex min-h-14 items-center py-2">{children}</div>;
}

function PlansPage() {
  const { role, profile } = useAuth();
  const { data, isLoading } = useQuery(productionPlansQuery);
  const { data: sos } = useQuery(salesOrdersQuery);
  const { data: plants } = useQuery(plantsQuery);
  const { data: lines } = useQuery(linesQuery);
  const { data: machines } = useQuery(machinesQuery);
  const { data: shifts } = useQuery(shiftsQuery);
  const { data: routings } = useQuery(routingsQuery);
  const rows = (data ?? []) as Row[];
  const salesOrders = (sos ?? []) as SalesOrder[];
  const lineRows = (lines ?? []) as Row[];
  const machineRows = (machines ?? []) as Row[];
  const shiftRows = (shifts ?? []) as Row[];
  const routingRows = (routings ?? []) as Row[];
  const canWrite = ["PPIC", "SYSADMIN"].includes(role ?? "");

  const calculateManpower = (item: PlanItemInput) => {
    const shift = shiftRows.find((row) => String(row.id) === item.shift_id);
    const available = shiftMinutes(shift);
    const routing = routingRows.find((row) => String(row.id) === item.routing_id);
    const operations = (routing?.routing_operations ?? []) as Row[];
    const laborMinutesPerUnit = operations.reduce(
      (total, operation) =>
        total + (numberValue(operation.standard_cycle_time_sec) * Math.max(numberValue(operation.manpower), 1)) / 60,
      0,
    );
    const requiredMinutes = numberValue(item.target_qty) * laborMinutesPerUnit;
    const routingMinimum = operations.reduce(
      (maximum, operation) => Math.max(maximum, numberValue(operation.manpower)),
      0,
    );
    const calculated = available > 0 ? Math.ceil(requiredMinutes / available) : 0;
    return { available, recommended: Math.max(calculated, routingMinimum) };
  };

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
        planned_date: toISODate(new Date()),
        line_id: "",
        machine_id: "",
        shift_id: "",
        routing_id: "",
        available_minutes: 0,
        recommended_manpower: 0,
        planned_manpower: 0,
        manpower_override_reason: "",
        material_readiness: "Belum Dicek",
        capacity_readiness: "Belum Dicek",
      };
    });
  };

  const stacked = (row: Row, renderItem: (item: StoredPlanItem) => ReactNode) => {
    const items = getPlanItems(row);
    if (items.length === 0) return "—";
    return (
      <ItemRows>
        {items.map((item, index) => (
          <ItemRow key={`${itemKey(item.product_id, item.variant_id, item.uom_id)}-${index}`}>
            {renderItem(item)}
          </ItemRow>
        ))}
      </ItemRows>
    );
  };

  const columns: Column<Row>[] = [
    { key: "plan_number", header: "No. Plan" },
    {
      key: "so",
      header: "Sales Order",
      value: (r) => (r.sales_orders as { so_number?: string } | null)?.so_number ?? "-",
    },
    {
      key: "products",
      header: "Produk/Varian",
      value: (r) =>
        getPlanItems(r)
          .map((item) => item.products?.name ?? "-")
          .join(", "),
      render: (r) =>
        stacked(r, (item) => (
          <div className="min-w-40">
            <p className="font-medium">{item.products?.name ?? "Produk"}</p>
            <p className="text-xs text-muted-foreground">{item.product_variants?.name ?? "-"}</p>
          </div>
        )),
    },
    {
      key: "demand_qty",
      header: "Quantity SO",
      align: "right",
      render: (r) =>
        stacked(r, (item) => (
          <span className="ml-auto whitespace-nowrap">
            {formatNumber(numberValue(item.demand_qty))} {item.units_of_measure?.code ?? "unit"}
          </span>
        )),
    },
    {
      key: "target_qty",
      header: "Target Plan",
      align: "right",
      render: (r) =>
        stacked(r, (item) => (
          <span className="ml-auto whitespace-nowrap font-medium">
            {formatNumber(numberValue(item.target_qty))} {item.units_of_measure?.code ?? "unit"}
          </span>
        )),
    },
    {
      key: "planned_date",
      header: "Tanggal/Shift Rencana",
      render: (r) =>
        stacked(r, (item) => (
          <div className="whitespace-nowrap">
            <p>{formatDate(item.planned_date)}</p>
            <p className="text-xs text-muted-foreground">{item.shifts?.name ?? "—"}</p>
          </div>
        )),
    },
    {
      key: "line_machine",
      header: "Line/Mesin",
      render: (r) =>
        stacked(r, (item) => (
          <div className="min-w-36">
            <p>{item.lines?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {item.machines ? `${item.machines.code ?? ""} ${item.machines.name ?? ""}`.trim() : "—"}
            </p>
          </div>
        )),
    },
    {
      key: "planned_manpower",
      header: "Manpower Plan",
      align: "right",
      render: (r) =>
        stacked(r, (item) => (
          <div className="ml-auto whitespace-nowrap text-right">
            <p>
              {numberValue(item.planned_manpower) > 0
                ? `${formatNumber(numberValue(item.planned_manpower))} orang`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              Rekomendasi {formatNumber(numberValue(item.recommended_manpower))}
            </p>
          </div>
        )),
    },
    {
      key: "readiness",
      header: "Kesiapan",
      render: (r) =>
        stacked(r, (item) => (
          <div className="flex flex-col gap-1">
            <StatusBadge status={String(item.material_readiness ?? "Belum Dicek")} />
            <span className="text-[10px] text-muted-foreground">
              Kapasitas: {item.capacity_readiness ?? "Belum Dicek"}
            </span>
          </div>
        )),
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

        const updateItem = (index: number, patch: Partial<PlanItemInput>) => {
          const next = [...items];
          const previous = next[index];
          let updated = { ...previous, ...patch };
          const result = calculateManpower(updated);
          const followedRecommendation =
            numberValue(previous.planned_manpower) === numberValue(previous.recommended_manpower) ||
            numberValue(previous.planned_manpower) === 0;
          updated = {
            ...updated,
            available_minutes: result.available,
            recommended_manpower: result.recommended,
            planned_manpower: followedRecommendation ? result.recommended : updated.planned_manpower,
          };
          next[index] = updated;
          setValue(next);
        };

        return (
          <div className="space-y-4">
            {items.map((item, index) => {
              const filteredMachines = machineRows.filter(
                (machine) => !item.line_id || String(machine.line_id ?? "") === item.line_id,
              );
              const filteredRoutings = routingRows.filter(
                (routing) =>
                  String(routing.product_id ?? "") === item.product_id &&
                  (!routing.variant_id || String(routing.variant_id) === String(item.variant_id ?? "")),
              );
              const fullyPlanned = item.max_target_qty <= 0;

              return (
                <div key={item.sales_order_item_id} className="rounded-xl border bg-card p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">Varian: {item.variant_name}</p>
                    </div>
                    <StatusBadge
                      status={
                        fullyPlanned
                          ? "Sudah Direncanakan"
                          : `Sisa ${formatNumber(item.max_target_qty)} ${item.uom_code}`
                      }
                    />
                  </div>

                  <div className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
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
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium">Target Plan *</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={item.max_target_qty}
                          step="any"
                          value={item.target_qty}
                          disabled={fullyPlanned}
                          onChange={(event) => {
                            updateItem(index, { target_qty: numberValue(event.target.value) });
                          }}
                        />
                        <span className="text-xs text-muted-foreground">{item.uom_code}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium">Tanggal Rencana *</p>
                      <Input
                        type="date"
                        value={item.planned_date}
                        disabled={fullyPlanned}
                        onChange={(e) => updateItem(index, { planned_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium">Line Rencana *</p>
                      <Select
                        value={item.line_id}
                        disabled={fullyPlanned}
                        onValueChange={(value) => updateItem(index, { line_id: value, machine_id: "" })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih line" />
                        </SelectTrigger>
                        <SelectContent>
                          {lineRows.map((line) => (
                            <SelectItem key={String(line.id)} value={String(line.id)}>
                              {String(line.name ?? line.code ?? "Line")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium">Mesin Rencana *</p>
                      <Select
                        value={item.machine_id}
                        disabled={fullyPlanned || !item.line_id}
                        onValueChange={(value) => updateItem(index, { machine_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih mesin" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredMachines.map((machine) => (
                            <SelectItem key={String(machine.id)} value={String(machine.id)}>
                              {String(machine.code ?? "")} — {String(machine.name ?? "Mesin")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium">Shift Rencana *</p>
                      <Select
                        value={item.shift_id}
                        disabled={fullyPlanned}
                        onValueChange={(value) => updateItem(index, { shift_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih shift" />
                        </SelectTrigger>
                        <SelectContent>
                          {shiftRows.map((shift) => (
                            <SelectItem key={String(shift.id)} value={String(shift.id)}>
                              {String(shift.name ?? "Shift")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium">Routing *</p>
                      <Select
                        value={item.routing_id}
                        disabled={fullyPlanned}
                        onValueChange={(value) => updateItem(index, { routing_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih routing" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredRoutings.map((routing) => (
                            <SelectItem key={String(routing.id)} value={String(routing.id)}>
                              {String(routing.code ?? routing.name ?? "Routing")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <p className="text-xs text-muted-foreground">Waktu Shift Tersedia</p>
                      <p className="font-semibold">{formatNumber(item.available_minutes)} menit</p>
                      <p className="mt-2 text-xs text-muted-foreground">Rekomendasi Manpower</p>
                      <p className="font-semibold text-primary">{formatNumber(item.recommended_manpower)} orang</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium">Planned Manpower *</p>
                      <Input
                        type="number"
                        min={1}
                        value={item.planned_manpower}
                        disabled={fullyPlanned}
                        onChange={(e) => updateItem(index, { planned_manpower: numberValue(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium">Kesiapan Material</p>
                      <Select
                        value={item.material_readiness}
                        disabled={fullyPlanned}
                        onValueChange={(value) => updateItem(index, { material_readiness: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {readiness.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium">Kesiapan Kapasitas</p>
                      <Select
                        value={item.capacity_readiness}
                        disabled={fullyPlanned}
                        onValueChange={(value) => updateItem(index, { capacity_readiness: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {readiness.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {numberValue(item.planned_manpower) !== numberValue(item.recommended_manpower) &&
                    numberValue(item.planned_manpower) > 0 ? (
                      <div className="space-y-1.5 sm:col-span-2">
                        <p className="text-xs font-medium">Alasan Penyesuaian Manpower *</p>
                        <Input
                          value={item.manpower_override_reason}
                          onChange={(e) => updateItem(index, { manpower_override_reason: e.target.value })}
                          placeholder="Jelaskan alasan jumlah manpower berbeda"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      name: "plant_id",
      label: "Plant",
      type: "select",
      required: true,
      options: toOptions(plants as Row[], ["name"]),
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
            if (!stored) return available;
            return {
              ...available,
              target_qty: numberValue(stored.target_qty),
              planned_date: String(stored.planned_date ?? available.planned_date),
              line_id: String(stored.line_id ?? ""),
              machine_id: String(stored.machine_id ?? ""),
              shift_id: String(stored.shift_id ?? ""),
              routing_id: String(stored.routing_id ?? ""),
              available_minutes: numberValue(stored.available_minutes),
              recommended_manpower: numberValue(stored.recommended_manpower),
              planned_manpower: numberValue(stored.planned_manpower),
              manpower_override_reason: String(stored.manpower_override_reason ?? ""),
              material_readiness: String(stored.material_readiness ?? "Belum Dicek"),
              capacity_readiness: String(stored.capacity_readiness ?? "Belum Dicek"),
            };
          }),
        };
      }}
      beforePayload={(values) => {
        const salesOrderId = String(values.sales_order_id ?? "").trim();
        const items = (values.plan_items ?? []) as PlanItemInput[];
        const selectedItems = items.filter((item) => numberValue(item.target_qty) > 0);

        if (!salesOrderId) throw new Error("Sales Order wajib dipilih.");
        if (!values.plant_id) throw new Error("Plant wajib dipilih.");
        if (selectedItems.length === 0) throw new Error("Isi minimal satu target Production Plan.");

        for (const item of selectedItems) {
          if (numberValue(item.target_qty) > numberValue(item.max_target_qty)) {
            throw new Error(`Target ${item.product_name} melebihi sisa quantity yang belum direncanakan.`);
          }
          if (!item.planned_date || !item.line_id || !item.machine_id || !item.shift_id || !item.routing_id) {
            throw new Error(`Lengkapi tanggal, line, mesin, shift, dan routing untuk ${item.product_name}.`);
          }
          if (numberValue(item.recommended_manpower) <= 0) {
            throw new Error(`Standar routing ${item.product_name} belum cukup untuk menghitung manpower.`);
          }
          if (numberValue(item.planned_manpower) <= 0) {
            throw new Error(`Planned manpower ${item.product_name} wajib lebih dari 0.`);
          }
          if (
            numberValue(item.planned_manpower) !== numberValue(item.recommended_manpower) &&
            !item.manpower_override_reason.trim()
          ) {
            throw new Error(`Alasan penyesuaian manpower ${item.product_name} wajib diisi.`);
          }
        }

        const dates = selectedItems.map((item) => item.planned_date).sort();
        const summarizeReadiness = (key: "material_readiness" | "capacity_readiness") => {
          const states = selectedItems.map((item) => item[key]);
          if (states.every((state) => state === "Siap")) return "Siap";
          if (states.every((state) => state === "Tidak Siap")) return "Tidak Siap";
          if (states.every((state) => state === "Belum Dicek")) return "Belum Dicek";
          return "Sebagian";
        };

        return {
          ...values,
          production_date: dates[0] ?? toISODate(new Date()),
          line_id: selectedItems[0]?.line_id || null,
          shift_id: null,
          material_readiness: summarizeReadiness("material_readiness"),
          capacity_readiness: summarizeReadiness("capacity_readiness"),
          created_by: profile?.id ?? null,
        };
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
            planned_date: item.planned_date,
            line_id: item.line_id,
            machine_id: item.machine_id,
            shift_id: item.shift_id,
            routing_id: item.routing_id,
            available_minutes: item.available_minutes,
            recommended_manpower: item.recommended_manpower,
            planned_manpower: item.planned_manpower,
            manpower_override_reason: item.manpower_override_reason || null,
            material_readiness: item.material_readiness,
            capacity_readiness: item.capacity_readiness,
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
            planned_date: item.planned_date,
            line_id: item.line_id,
            machine_id: item.machine_id,
            shift_id: item.shift_id,
            routing_id: item.routing_id,
            available_minutes: item.available_minutes,
            recommended_manpower: item.recommended_manpower,
            planned_manpower: item.planned_manpower,
            manpower_override_reason: item.manpower_override_reason || null,
            material_readiness: item.material_readiness,
            capacity_readiness: item.capacity_readiness,
          })),
        );
        if (insertError) throw new Error(insertError.message);
      }}
    />
  );
}
