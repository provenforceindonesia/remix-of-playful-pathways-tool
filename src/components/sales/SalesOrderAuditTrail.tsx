import { useQuery } from "@tanstack/react-query";
import { ArrowRight, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { profilesQuery } from "@/lib/queries";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatFullDateTime } from "@/lib/format";

type Row = Record<string, unknown>;

export type AuditEntry = {
  at: string;
  action: string;
  from?: string | null;
  to?: string | null;
  user: string;
  role: string;
  note?: string | null;
  source: "approval" | "audit";
};

export function useSalesOrderAudit(soId: string, enabled = true) {
  const { data: profiles } = useQuery({ ...profilesQuery, enabled: enabled && Boolean(soId) });

  const person = (id: unknown) => {
    const p = ((profiles ?? []) as Row[]).find((x) => String(x.id) === String(id ?? ""));
    if (!p) return { name: "-", role: "-" };
    return {
      name: String(p.full_name ?? p.username ?? "-"),
      role: (p.roles as { name?: string; code?: string } | null)?.name ?? "-",
    };
  };

  return useQuery({
    queryKey: ["so_audit_trail", soId, ((profiles ?? []) as Row[]).length],
    enabled: enabled && Boolean(soId),
    queryFn: async (): Promise<AuditEntry[]> => {
      const [approval, audit] = await Promise.all([
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
      ]);
      if (approval.error) throw new Error(approval.error.message);
      if (audit.error) throw new Error(audit.error.message);

      const fromApproval: AuditEntry[] = ((approval.data ?? []) as Row[]).map((h) => {
        const p = person(h.actor_id);
        return {
          at: String(h.created_at ?? ""),
          action: String(h.action ?? "Perubahan status"),
          from: (h.from_status as string) ?? null,
          to: (h.to_status as string) ?? null,
          user: p.name,
          role: String(h.actor_role ?? p.role ?? "-"),
          note: (h.note as string) ?? null,
          source: "approval",
        };
      });

      const fromAudit: AuditEntry[] = ((audit.data ?? []) as Row[])
        .filter((a) => !fromApproval.some((x) => x.at === String(a.created_at ?? "")))
        .map((a) => {
          const p = person(a.user_id);
          const after = (a.after_value as Record<string, unknown> | null) ?? null;
          return {
            at: String(a.created_at ?? ""),
            action: String(a.action ?? "-"),
            from: null,
            to: after && after.status ? String(after.status) : null,
            user: String(a.username ?? p.name ?? "-"),
            role: String(a.role_code ?? p.role ?? "-"),
            note: (a.reason as string) ?? null,
            source: "audit",
          };
        });

      return [...fromApproval, ...fromAudit].sort((x, y) => x.at.localeCompare(y.at));
    },
  });
}

export function SalesOrderAuditTrail({
  soId,
  enabled = true,
  fallback = [],
  emptyText = "Belum ada riwayat perubahan.",
}: {
  soId: string;
  enabled?: boolean;
  fallback?: { at: string; text: string }[];
  emptyText?: string;
}) {
  const { data, isLoading } = useSalesOrderAudit(soId, enabled);
  const entries = (data ?? []) as AuditEntry[];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat riwayat…</p>;
  }

  if (entries.length === 0) {
    if (fallback.length) {
      return (
        <ol className="space-y-3">
          {fallback.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{formatFullDateTime(t.at)}</p>
                <p className="text-sm">{t.text}</p>
              </div>
            </li>
          ))}
        </ol>
      );
    }
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <History className="size-4" /> {emptyText}
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-border/60 pl-5">
      {entries.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative">
          <span className="absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-background" />
          <p className="text-xs text-muted-foreground">{formatFullDateTime(e.at)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{e.action}</span>
            {e.from ? (
              <span className="flex items-center gap-1.5">
                <StatusBadge status={e.from} />
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </span>
            ) : null}
            {e.to ? <StatusBadge status={e.to} /> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {e.user} · {e.role}
          </p>
          {e.note ? <p className="mt-1 text-sm">Catatan: {e.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
