import { createServerFn } from "@tanstack/react-start";

export type SeedResult = { created: boolean; message: string };

const DEMO_USERS = [
  { username: "owner", email: "owner@manufactureiq.demo", password: "OwnerDemo123!", full_name: "Hendrawan Wijaya", role: "OWNER", emp: "EMP-001" },
  { username: "salesadmin", email: "salesadmin@manufactureiq.demo", password: "SalesDemo123!", full_name: "Ratna Puspita", role: "SALES", emp: "EMP-002" },
  { username: "productioncontrol", email: "productioncontrol@manufactureiq.demo", password: "ProductionDemo123!", full_name: "Bagus Prasetyo", role: "PPIC", emp: "EMP-003" },
  { username: "engineer", email: "engineer@manufactureiq.demo", password: "EngineerDemo123!", full_name: "Nadia Larasati", role: "IE", emp: "EMP-004" },
  { username: "productionteam", email: "productionteam@manufactureiq.demo", password: "ShopfloorDemo123!", full_name: "Joko Susilo", role: "SHOPFLOOR", emp: "EMP-005" },
  { username: "inventory", email: "inventory@manufactureiq.demo", password: "InventoryDemo123!", full_name: "Firman Hidayat", role: "INVENTORY", emp: "EMP-006" },
  { username: "finance", email: "finance@manufactureiq.demo", password: "FinanceDemo123!", full_name: "Ayu Kartika", role: "FINANCE", emp: "EMP-007" },
  { username: "sysadmin", email: "sysadmin@manufactureiq.demo", password: "AdminDemo123!", full_name: "Rizal Maulana", role: "SYSADMIN", emp: "EMP-008" },
];

const EXTRA_OPERATORS = [
  { username: "operator2", email: "operator2@manufactureiq.demo", password: "ShopfloorDemo123!", full_name: "Sri Handayani", role: "SHOPFLOOR", emp: "EMP-009" },
  { username: "operator3", email: "operator3@manufactureiq.demo", password: "ShopfloorDemo123!", full_name: "Andi Nugroho", role: "SHOPFLOOR", emp: "EMP-010" },
  { username: "operator4", email: "operator4@manufactureiq.demo", password: "ShopfloorDemo123!", full_name: "Marlina Dewi", role: "SHOPFLOOR", emp: "EMP-011" },
  { username: "operator5", email: "operator5@manufactureiq.demo", password: "ShopfloorDemo123!", full_name: "Yusuf Ramadhan", role: "SHOPFLOOR", emp: "EMP-012" },
];

/**
 * Menyiapkan akun demo dan data transaksi demo. Idempoten: tidak melakukan apa pun
 * jika profil sudah ada di database.
 */
export const seedDemoData = createServerFn({ method: "POST" }).handler(
  async (): Promise<SeedResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return { created: false, message: "Data demo sudah tersedia." };

    const { data: roles } = await supabaseAdmin.from("roles").select("id,code");
    const { data: plant } = await supabaseAdmin.from("plants").select("id").limit(1).maybeSingle();
    const { data: lines } = await supabaseAdmin.from("lines").select("id,code");
    const { data: shifts } = await supabaseAdmin.from("shifts").select("id,code");
    const roleId = (code: string) => roles?.find((r) => r.code === code)?.id ?? null;

    const all = [...DEMO_USERS, ...EXTRA_OPERATORS];
    const ids: Record<string, string> = {};

    for (const u of all) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name, username: u.username },
      });
      if (error || !created?.user) continue;
      ids[u.username] = created.user.id;
      await supabaseAdmin.from("profiles").insert({
        id: created.user.id,
        username: u.username,
        full_name: u.full_name,
        email: u.email,
        employee_code: u.emp,
        role_id: roleId(u.role),
        plant_id: plant?.id ?? null,
        line_id: u.role === "SHOPFLOOR" ? (lines?.[0]?.id ?? null) : null,
        shift_id: u.role === "SHOPFLOOR" ? (shifts?.[0]?.id ?? null) : null,
        theme_preference: "dark",
      });
    }

    const ppic = ids["productioncontrol"];
    const operators = [
      ids["productionteam"],
      ids["operator2"],
      ids["operator3"],
      ids["operator4"],
      ids["operator5"],
    ].filter(Boolean);

    const { data: workOrders } = await supabaseAdmin
      .from("work_orders")
      .select("id,target_qty,standard_speed,standard_cycle_time_sec,machine_id,shift_id,plant_id,sales_order_id,product_id")
      .order("created_at");

    if (workOrders?.length) {
      await supabaseAdmin.from("work_order_assignments").insert(
        workOrders.flatMap((wo, i) =>
          operators.length
            ? [{ work_order_id: wo.id, profile_id: operators[i % operators.length]!, role_on_wo: "Operator" }]
            : [],
        ),
      );

      const { data: reasonCodes } = await supabaseAdmin
        .from("downtime_reason_codes")
        .select("id,code,category,requires_maintenance");

      for (const [i, wo] of workOrders.entries()) {
        const dayOffset = 4 - (i % 4);
        const date = new Date(Date.now() - dayOffset * 86400000).toISOString().slice(0, 10);
        const target = Number(wo.target_qty);
        const totalOutput = Math.round(target * (i % 3 === 0 ? 0.88 : 1.02));
        const reject = Math.round(totalOutput * 0.022);
        const rework = Math.round(totalOutput * 0.012);
        const good = totalOutput - reject - rework;
        const downtime = [45, 90, 25, 130][i % 4]!;
        const freq = [2, 3, 1, 4][i % 4]!;

        const { data: entry } = await supabaseAdmin
          .from("production_entries")
          .insert({
            work_order_id: wo.id,
            plant_id: wo.plant_id,
            production_date: date,
            shift_id: wo.shift_id,
            start_time: "07:00",
            end_time: "15:00",
            break_minutes: 60,
            total_output: totalOutput,
            good_output: good,
            reject_qty: reject,
            rework_qty: rework,
            waste_material: Math.round(totalOutput * 0.01),
            downtime_minutes: downtime,
            downtime_frequency: freq,
            notes: "Data demo hasil produksi",
            status: "Tervalidasi",
            created_by: operators[i % Math.max(1, operators.length)] ?? null,
            created_role: "SHOPFLOOR",
            validated_by: ppic ?? null,
            validated_at: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle();

        const rc = reasonCodes?.[i % (reasonCodes?.length || 1)];
        if (entry && rc) {
          await supabaseAdmin.from("downtime_records").insert({
            work_order_id: wo.id,
            production_entry_id: entry.id,
            machine_id: wo.machine_id,
            plant_id: wo.plant_id,
            downtime_date: date,
            shift_id: wo.shift_id,
            operator_id: operators[i % Math.max(1, operators.length)] ?? null,
            start_time: "09:15",
            end_time: `${9 + Math.floor(downtime / 60)}:${String(15 + (downtime % 60)).padStart(2, "0")}`.slice(0, 5),
            reason_code_id: rc.id,
            category: rc.category,
            cause: "Penyebab tercatat oleh operator saat shift berlangsung",
            temporary_action: "Penyetelan ulang dan pembersihan",
            requires_maintenance: rc.requires_maintenance,
            status: rc.requires_maintenance ? "Membutuhkan Perawatan" : "Selesai",
            created_by: operators[i % Math.max(1, operators.length)] ?? null,
          });
        }
      }

      // Work order recovery untuk backlog pertama
      const { data: backlog } = await supabaseAdmin
        .from("backlog_ledger")
        .select("id, work_order_id, shortage_qty")
        .gt("shortage_qty", 0)
        .limit(1)
        .maybeSingle();

      if (backlog) {
        const parent = workOrders.find((w) => w.id === backlog.work_order_id);
        if (parent) {
          const { data: rec } = await supabaseAdmin
            .from("work_orders")
            .insert({
              parent_wo_id: parent.id,
              sales_order_id: parent.sales_order_id,
              wo_type: "Recovery",
              plant_id: parent.plant_id,
              shift_id: parent.shift_id,
              product_id: parent.product_id,
              machine_id: parent.machine_id,
              target_qty: backlog.shortage_qty,
              standard_speed: parent.standard_speed,
              standard_cycle_time_sec: parent.standard_cycle_time_sec,
              priority: "Tinggi",
              status: "Released",
              created_by: ppic ?? null,
              released_by: ppic ?? null,
              released_at: new Date().toISOString(),
            })
            .select("id")
            .maybeSingle();
          if (rec) {
            await supabaseAdmin.from("recovery_links").insert({
              backlog_id: backlog.id,
              recovery_wo_id: rec.id,
              recovered_qty: 0,
            });
          }
        }
      }
    }

    // Time study demo
    const { data: machines } = await supabaseAdmin.from("machines").select("id,code,standard_speed");
    const { data: products } = await supabaseAdmin.from("products").select("id,code");
    if (machines?.length && products?.length) {
      await supabaseAdmin.from("time_studies").insert(
        machines.slice(0, 3).map((m, i) => ({
          product_id: products[i % products.length]!.id,
          process_name: "Proses Utama",
          machine_id: m.id,
          observer_id: ids["engineer"] ?? null,
          observed_output: 240 + i * 30,
          observed_minutes: 30,
          setup_time_min: 12,
          idle_time_min: 4,
          manpower: 2,
          actual_cycle_time_sec: Number((((30 - 4) * 60) / (240 + i * 30)).toFixed(2)),
          status: "Validated",
          created_by: ids["engineer"] ?? null,
          validated_by: ids["engineer"] ?? null,
          validated_at: new Date().toISOString(),
        })),
      );
    }

    // Notifikasi demo
    await supabaseAdmin.from("notifications").insert([
      {
        recipient_role: "PPIC",
        title: "Permintaan order menunggu review",
        body: "Terdapat sales order baru yang membutuhkan review kapasitas dan material.",
        category: "order",
        severity: "warning",
        link_path: "/sales/review",
      },
      {
        recipient_role: "INVENTORY",
        title: "Stok material mendekati titik pesan ulang",
        body: "Stabilizer (MAT-003) berada di bawah reorder point.",
        category: "inventory",
        severity: "danger",
        link_path: "/inventory/stock",
      },
    ]);

    return { created: true, message: "Data demo berhasil dibuat." };
  },
);
