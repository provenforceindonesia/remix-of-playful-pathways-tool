import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { profilesQuery } from "@/lib/queries";
import { formatFullDateTime } from "@/lib/format";

type Row = Record<string, unknown>;

export type TimelineEvent = {
  id: string;
  occurredAt: string;
  eventType: string;
  description: string;
  actorName: string | null;
  actorRole: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  SALES: "Sales Admin",
  PPIC: "Production Control",
  SHOPFLOOR: "Production Team",
  SYSADMIN: "System Admin",
  OWNER: "Owner",
  FINANCE: "Finance",
  INVENTORY: "Inventory",
  QC: "Quality Control",
};

const roleLabel = (raw: unknown): string | null => {
  const v = String(raw ?? "").trim();
  if (!v || v === "-") return null;
  return ROLE_LABEL[v.toUpperCase()] ?? v;
};

const actorSuffix = (name: string | null, role: string | null) => {
  if (name && role) return ` oleh ${name} · ${role}`;
  if (name) return ` oleh ${name}`;
  if (role) return ` oleh ${role}`;
  return "";
};

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

/** Maps a raw action + status transition into a business-language event. */
function describe(
  action: unknown,
  from: unknown,
  to: unknown,
  name: string | null,
  role: string | null,
): { type: string; text: string } | null {
  const a = norm(action);
  const f = norm(from);
  const t = norm(to);
  const who = actorSuffix(name, role);
  const ppic = actorSuffix(name, role ?? "Production Control");
  const sales = actorSuffix(name, role ?? "Sales Admin");

  if (t === "menunggu review produksi" && f === "perlu revisi")
    return { type: "resubmit", text: "Order dikirim ulang untuk review produksi" };
  if (t === "menunggu review produksi" || a.includes("submit") || a.includes("kirim"))
    return { type: "submit", text: "Order dikirim untuk review produksi" };
  if (t === "perlu revisi" || a.includes("revisi") || a.includes("reject"))
    return { type: "revise", text: `Order dikembalikan untuk revisi${ppic}` };
  if (t === "dikonfirmasi" || a.includes("approve") || a.includes("konfirmasi"))
    return { type: "approve", text: `Order dikonfirmasi${ppic}` };
  if (t === "menunggu persetujuan pembatalan" || a.includes("ajukan pembatalan"))
    return { type: "cancel_request", text: `Pembatalan order diajukan${sales}` };
  if (a.includes("pembatalan disetujui"))
    return { type: "cancel_approved", text: `Pembatalan order disetujui${ppic}` };
  if (a.includes("pembatalan ditolak"))
    return { type: "cancel_rejected", text: `Pembatalan order ditolak${ppic}` };
  if (t === "dibatalkan" || a.includes("batal"))
    return { type: "cancelled", text: `Order dibatalkan${who}` };
  if (t === "draft" || a === "create" || a.includes("dibuat"))
    return { type: "created", text: `Order dibuat${who}` };
  if (t) return { type: `status:${t}`, text: `Status order diperbarui menjadi ${String(to)}` };
  return null;
}

export function useSalesOrderTimeline(soId: string, enabled = true) {
  const { data: profiles } = useQuery({ ...profilesQuery, enabled: enabled && Boolean(soId) });
  const list = (profiles ?? []) as Row[];

  const person = (id: unknown) => {
    const p = list.find((x) => String(x.id) === String(id ?? ""));
    if (!p) return { name: null as string | null, role: null as string | null };
    const full = String(p.full_name ?? "").trim();
    const uname = String(p.username ?? "").trim();
    const r = p.roles as { name?: string; code?: string } | null;
    return {
      name: full || uname || null,
      role: roleLabel(r?.code) ?? (r?.name ? String(r.name) : null),
    };
  };

  return useQuery({
    queryKey: ["so_timeline", soId, list.length],
    enabled: enabled && Boolean(soId),
    queryFn: async (): Promise<TimelineEvent[]> => {
      const [approval, audit, order, plans] = await Promise.all([
        supabase
          .from("approval_history")
          .select("*")
          .eq("entity", "sales_orders")
          .eq("record_id", soId)
          .order("created_at", { ascending: true }),
        supabase
          .from("audit_logs")
          .select("*")
          .eq("entity", "sales_orders")
          .eq("record_id", soId)
          .order("created_at", { ascending: true }),
        supabase
          .from("sales_orders")
          .select("created_at,created_by,submitted_at,approved_at,approved_by,status")
          .eq("id", soId)
          .maybeSingle(),
        supabase
          .from("production_plans")
          .select("id,plan_number,created_at,created_by")
          .eq("sales_order_id", soId)
          .order("created_at", { ascending: true }),
      ]);

      const events: TimelineEvent[] = [];
      const push = (
        id: string,
        at: unknown,
        d: { type: string; text: string } | null,
        name: string | null,
        role: string | null,
      ) => {
        const when = String(at ?? "");
        if (!when || !d) return;
        events.push({
          id,
          occurredAt: when,
          eventType: d.type,
          description: d.text,
          actorName: name,
          actorRole: role,
        });
      };

      const o = (order.data ?? null) as Row | null;
      if (o) {
        const creator = person(o.created_by);
        push(
          "so-created",
          o.created_at,
          { type: "created", text: `Order dibuat${actorSuffix(creator.name, creator.role)}` },
          creator.name,
          creator.role,
        );
        push(
          "so-submitted",
          o.submitted_at,
          { type: "submit", text: "Order dikirim untuk review produksi" },
          null,
          null,
        );
        const approver = person(o.approved_by);
        push(
          "so-approved",
          o.approved_at,
          {
            type: "approve",
            text: `Order dikonfirmasi${actorSuffix(approver.name, approver.role ?? "Production Control")}`,
          },
          approver.name,
          approver.role ?? "Production Control",
        );
      }

      ((approval.data ?? []) as Row[]).forEach((h, i) => {
        const p = person(h.actor_id);
        const role = p.role ?? roleLabel(h.actor_role);
        push(
          `ap-${String(h.id ?? i)}`,
          h.created_at,
          describe(h.action, h.from_status, h.to_status, p.name, role),
          p.name,
          role,
        );
      });

      ((audit.data ?? []) as Row[]).forEach((a, i) => {
        const p = person(a.user_id);
        const role = p.role ?? roleLabel(a.role_code);
        const after = (a.after_value as Record<string, unknown> | null) ?? null;
        const before = (a.before_value as Record<string, unknown> | null) ?? null;
        push(
          `au-${String(a.id ?? i)}`,
          a.created_at,
          describe(a.action, before?.status, after?.status, p.name, role),
          p.name,
          role,
        );
      });

      ((plans.data ?? []) as Row[]).forEach((p, i) => {
        const who = person(p.created_by);
        push(
          `pp-${String(p.id ?? i)}`,
          p.created_at,
          {
            type: "plan_created",
            text: `Production Plan ${String(p.plan_number ?? "-")} dibuat${actorSuffix(
              who.name,
              who.role ?? "Production Control",
            )}`,
          },
          who.name,
          who.role ?? "Production Control",
        );
      });

      events.sort((x, y) => x.occurredAt.localeCompare(y.occurredAt));

      // Deduplicate: same event type occurring within 2 minutes counts once,
      // preferring the entry that carries an actor name.
      const kept: TimelineEvent[] = [];
      for (const e of events) {
        const dupIndex = kept.findIndex(
          (k) =>
            k.eventType === e.eventType &&
            Math.abs(new Date(k.occurredAt).getTime() - new Date(e.occurredAt).getTime()) <= 120000,
        );
        if (dupIndex === -1) {
          kept.push(e);
        } else if (!kept[dupIndex].actorName && e.actorName) {
          kept[dupIndex] = { ...e, occurredAt: kept[dupIndex].occurredAt };
        }
      }
      return kept;
    },
  });
}

export function SalesOrderAuditTrail({
  soId,
  enabled = true,
  emptyText = "Belum ada riwayat perubahan.",
}: {
  soId: string;
  enabled?: boolean;
  emptyText?: string;
}) {
  const { data, isLoading } = useSalesOrderTimeline(soId, enabled);
  const entries = (data ?? []) as TimelineEvent[];

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat riwayat…</p>;

  if (entries.length === 0)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <History className="size-4" /> {emptyText}
      </p>
    );

  return (
    <ol className="relative space-y-4 border-l border-border/60 pl-5">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-primary ring-4 ring-background" />
          <p className="text-xs text-muted-foreground">{formatFullDateTime(e.occurredAt)}</p>
          <p className="mt-0.5 text-sm font-medium">{e.description}</p>
        </li>
      ))}
    </ol>
  );
}
