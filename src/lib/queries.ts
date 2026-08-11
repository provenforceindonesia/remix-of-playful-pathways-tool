import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export type Row = Record<string, unknown>;

export const plantsQuery = queryOptions({
  queryKey: ["plants"],
  queryFn: () => must(supabase.from("plants").select("*").order("code")),
});

export const linesQuery = queryOptions({
  queryKey: ["lines"],
  queryFn: () => must(supabase.from("lines").select("*").order("code")),
});

export const shiftsQuery = queryOptions({
  queryKey: ["shifts"],
  queryFn: () => must(supabase.from("shifts").select("*").order("code")),
});

export const machinesQuery = queryOptions({
  queryKey: ["machines"],
  queryFn: () =>
    must(
      supabase
        .from("machines")
        .select("*, lines:line_id(code,name), work_centers:work_center_id(code,name), plants:plant_id(code,name)")
        .order("code"),
    ),
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: () =>
    must(
      supabase
        .from("products")
        .select("*, units_of_measure:base_uom_id(code,name), product_variants(id,code,name)")
        .order("code"),
    ),
});

export const uomQuery = queryOptions({
  queryKey: ["uom"],
  queryFn: () => must(supabase.from("units_of_measure").select("*").order("code")),
});

export const customersQuery = queryOptions({
  queryKey: ["customers"],
  queryFn: () => must(supabase.from("customers").select("*").is("deleted_at", null).order("code")),
});

export const materialsQuery = queryOptions({
  queryKey: ["materials"],
  queryFn: () => must(supabase.from("materials").select("*, units_of_measure:uom_id(code)").order("code")),
});

export const salesOrdersQuery = queryOptions({
  queryKey: ["sales_orders"],
  queryFn: () =>
    must(
      supabase
        .from("sales_orders")
        .select(
          "*, customers:customer_id(code,name), sales_order_items(id,quantity,fulfilled_qty,unit_price,product_id,variant_id,uom_id,products:product_id(code,name),product_variants:variant_id(name),units_of_measure:uom_id(code))",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ),
});

export const workOrdersQuery = queryOptions({
  queryKey: ["work_orders"],
  queryFn: () =>
    must(
      supabase
        .from("work_orders")
        .select(
          "*, products:product_id(code,name), product_variants:variant_id(name), machines:machine_id(code,name), shifts:shift_id(name), lines:line_id(name), sales_orders:sales_order_id(so_number), units_of_measure:uom_id(code)",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ),
});

export const productionPlansQuery = queryOptions({
  queryKey: ["production_plans"],
  queryFn: () =>
    must(
      supabase
        .from("production_plans")
        .select(
          "*, sales_orders:sales_order_id(so_number), production_plan_items(id,product_id,variant_id,uom_id,demand_qty,target_qty,planned_date,line_id,machine_id,shift_id,routing_id,available_minutes,recommended_manpower,planned_manpower,manpower_override_reason,material_readiness,capacity_readiness,products:product_id(code,name),product_variants:variant_id(name),units_of_measure:uom_id(code),lines:line_id(name),machines:machine_id(code,name),shifts:shift_id(name),routings:routing_id(code,name))",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ),
});

export const productionEntriesQuery = queryOptions({
  queryKey: ["production_entries"],
  queryFn: () =>
    must(
      supabase
        .from("production_entries")
        .select(
          "*, work_orders:work_order_id(wo_number,target_qty,standard_speed,standard_cycle_time_sec,products:product_id(code,name),machines:machine_id(code,name)), shifts:shift_id(name), profiles:created_by(full_name)",
        )
        .is("deleted_at", null)
        .order("production_date", { ascending: false }),
    ),
});

export const kpiQuery = queryOptions({
  queryKey: ["v_production_kpi"],
  queryFn: () => must(supabase.from("v_production_kpi").select("*").order("production_date", { ascending: false })),
});

export const machineHealthQuery = queryOptions({
  queryKey: ["v_machine_health"],
  queryFn: () => must(supabase.from("v_machine_health").select("*").order("machine_code")),
});

export const downtimeQuery = queryOptions({
  queryKey: ["downtime_records"],
  queryFn: () =>
    must(
      supabase
        .from("downtime_records")
        .select(
          "*, machines:machine_id(code,name), work_orders:work_order_id(wo_number), shifts:shift_id(name), downtime_reason_codes:reason_code_id(code,name,category)",
        )
        .is("deleted_at", null)
        .order("downtime_date", { ascending: false }),
    ),
});

export const reasonCodesQuery = queryOptions({
  queryKey: ["downtime_reason_codes"],
  queryFn: () => must(supabase.from("downtime_reason_codes").select("*").order("code")),
});

export const backlogQuery = queryOptions({
  queryKey: ["backlog_ledger"],
  queryFn: () =>
    must(
      supabase
        .from("backlog_ledger")
        .select("*, work_orders:work_order_id(wo_number), products:product_id(code,name)")
        .order("created_at", { ascending: false }),
    ),
});

export const stockQuery = queryOptions({
  queryKey: ["stock_balances"],
  queryFn: () =>
    must(
      supabase
        .from("stock_balances")
        .select("*, materials:material_id(code,name,min_stock,reorder_point), warehouses:warehouse_id(code,name)"),
    ),
});

export const stockLedgerQuery = queryOptions({
  queryKey: ["stock_ledger"],
  queryFn: () =>
    must(
      supabase
        .from("stock_ledger")
        .select("*, materials:material_id(code,name), warehouses:warehouse_id(code)")
        .order("txn_date", { ascending: false })
        .limit(500),
    ),
});

export const suppliersQuery = queryOptions({
  queryKey: ["suppliers"],
  queryFn: () => must(supabase.from("suppliers").select("*").order("code")),
});

export const purchaseOrdersQuery = queryOptions({
  queryKey: ["purchase_orders"],
  queryFn: () =>
    must(
      supabase
        .from("purchase_orders")
        .select(
          "*, suppliers:supplier_id(code,name), purchase_order_items(id,qty,unit_price,received_qty,materials:material_id(code,name))",
        )
        .order("created_at", { ascending: false }),
    ),
});

export const hppQuery = queryOptions({
  queryKey: ["standard_hpp"],
  queryFn: () =>
    must(
      supabase
        .from("standard_hpp_versions")
        .select("*, standard_hpp_details(*, products:product_id(code,name), product_variants:variant_id(name))")
        .order("effective_date", { ascending: false }),
    ),
});

export const lossQuery = queryOptions({
  queryKey: ["loss_valuations"],
  queryFn: () =>
    must(
      supabase
        .from("loss_valuations")
        .select("*, work_orders:work_order_id(wo_number, products:product_id(code,name))")
        .order("period_date", { ascending: false }),
    ),
});

export const timeStudiesQuery = queryOptions({
  queryKey: ["time_studies"],
  queryFn: () =>
    must(
      supabase
        .from("time_studies")
        .select("*, products:product_id(code,name), machines:machine_id(code,name), shifts:shift_id(name)")
        .order("study_date", { ascending: false }),
    ),
});

export const routingsQuery = queryOptions({
  queryKey: ["routings"],
  queryFn: () =>
    must(
      supabase
        .from("routings")
        .select(
          "*, products:product_id(code,name), product_variants:variant_id(name), routing_operations(*, machines:machine_id(code,name), work_centers:work_center_id(code,name))",
        )
        .order("code"),
    ),
});

export const workCentersQuery = queryOptions({
  queryKey: ["work_centers"],
  queryFn: () =>
    must(supabase.from("work_centers").select("*, lines:line_id(code,name), plants:plant_id(code,name)").order("code")),
});

export const bomQuery = queryOptions({
  queryKey: ["bom_headers"],
  queryFn: () =>
    must(
      supabase
        .from("bom_headers")
        .select(
          "*, products:product_id(code,name), product_variants:variant_id(name), bom_items(*, materials:material_id(code,name), units_of_measure:uom_id(code))",
        )
        .order("created_at", { ascending: false }),
    ),
});

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: () =>
    must(
      supabase
        .from("profiles")
        .select("*, roles:role_id(code,name), plants:plant_id(name), lines:line_id(name), shifts:shift_id(name)")
        .order("username"),
    ),
});

export const rolesQuery = queryOptions({
  queryKey: ["roles"],
  queryFn: () => must(supabase.from("roles").select("*").order("sort_order")),
});

export const permissionsQuery = queryOptions({
  queryKey: ["permissions"],
  queryFn: () => must(supabase.from("permissions").select("*").order("module")),
});

export const rolePermissionsQuery = queryOptions({
  queryKey: ["role_permissions"],
  queryFn: () => must(supabase.from("role_permissions").select("*")),
});

export const auditQuery = queryOptions({
  queryKey: ["audit_logs"],
  queryFn: () => must(supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300)),
});

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: () => must(supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50)),
});

export const settingsQuery = queryOptions({
  queryKey: ["system_settings"],
  queryFn: () => must(supabase.from("system_settings").select("*").order("key")),
});

export const reservationsQuery = queryOptions({
  queryKey: ["stock_reservations"],
  queryFn: () =>
    must(
      supabase
        .from("stock_reservations")
        .select("*, materials:material_id(code,name), work_orders:work_order_id(wo_number)")
        .order("created_at", { ascending: false }),
    ),
});

export const handoverQuery = queryOptions({
  queryKey: ["handovers"],
  queryFn: () =>
    must(
      supabase
        .from("handovers")
        .select(
          "*, from_shift:from_shift_id(name), to_shift:to_shift_id(name), lines:line_id(name), work_orders:work_order_id(wo_number)",
        )
        .order("handover_date", { ascending: false }),
    ),
});

export const costMasterQuery = {
  materialCosts: queryOptions({
    queryKey: ["material_costs"],
    queryFn: () =>
      must(
        supabase
          .from("material_costs")
          .select("*, materials:material_id(code,name)")
          .order("effective_date", { ascending: false }),
      ),
  }),
  machineRates: queryOptions({
    queryKey: ["machine_rates"],
    queryFn: () =>
      must(
        supabase
          .from("machine_rates")
          .select("*, machines:machine_id(code,name)")
          .order("effective_date", { ascending: false }),
      ),
  }),
  laborRates: queryOptions({
    queryKey: ["labor_rates"],
    queryFn: () => must(supabase.from("labor_rates").select("*").order("effective_date", { ascending: false })),
  }),
  overheadRates: queryOptions({
    queryKey: ["overhead_rates"],
    queryFn: () => must(supabase.from("overhead_rates").select("*").order("effective_date", { ascending: false })),
  }),
};

export const warehousesQuery = queryOptions({
  queryKey: ["warehouses"],
  queryFn: () => must(supabase.from("warehouses").select("*, plants:plant_id(name)").order("code")),
});

export const materialReceiptsQuery = queryOptions({
  queryKey: ["material_receipts"],
  queryFn: () =>
    must(
      supabase
        .from("material_receipts")
        .select(
          "*, materials:material_id(code,name), suppliers:supplier_id(code,name), warehouses:warehouse_id(code,name)",
        )
        .order("receipt_date", { ascending: false }),
    ),
});

export const materialIssuesQuery = queryOptions({
  queryKey: ["material_issues"],
  queryFn: () =>
    must(
      supabase
        .from("material_issues")
        .select(
          "*, materials:material_id(code,name), work_orders:work_order_id(wo_number), warehouses:warehouse_id(code,name)",
        )
        .order("issue_date", { ascending: false }),
    ),
});

export const capacityPlansQuery = queryOptions({
  queryKey: ["capacity_plans"],
  queryFn: () =>
    must(
      supabase
        .from("capacity_plans")
        .select(
          "*, lines:line_id(name), machines:machine_id(code,name), shifts:shift_id(name), products:product_id(code,name), product_variants:variant_id(name), routings:routing_id(code,name)",
        )
        .order("plan_date", { ascending: false }),
    ),
});

export const manpowerQuery = queryOptions({
  queryKey: ["manpower_recommendations"],
  queryFn: () =>
    must(
      supabase
        .from("manpower_recommendations")
        .select("*, lines:line_id(name)")
        .order("period_date", { ascending: false }),
    ),
});

export const productionDailyQuery = queryOptions({
  queryKey: ["v_production_daily"],
  queryFn: () => must(supabase.from("v_production_daily").select("*").order("production_date", { ascending: false })),
});

export const maintenanceLogsQuery = queryOptions({
  queryKey: ["maintenance_logs"],
  queryFn: () =>
    must(
      supabase
        .from("maintenance_logs")
        .select("*, machines:machine_id(code,name)")
        .order("log_date", { ascending: false }),
    ),
});

export const actualCostsQuery = queryOptions({
  queryKey: ["actual_production_costs"],
  queryFn: () =>
    must(
      supabase
        .from("actual_production_costs")
        .select("*, work_orders:work_order_id(wo_number, products:product_id(code,name))")
        .order("period_date", { ascending: false }),
    ),
});
