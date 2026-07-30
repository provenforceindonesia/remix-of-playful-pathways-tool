import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SalesOrderAuditTrail } from "@/components/sales/SalesOrderAuditTrail";
import { salesOrdersQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sales/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail Sales Order — MANUFACTUREIQ" },
      {
        name: "description",
        content: "Riwayat perubahan status per nomor SO lengkap dengan user, role, dan timestamp.",
      },
      { property: "og:title", content: "Audit Trail Sales Order — MANUFACTUREIQ" },
      {
        property: "og:description",
        content: "Telusuri jejak audit setiap sales order secara kronologis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalesAuditPage,
});

type Row = Record<string, unknown>;

function SalesAuditPage() {
  const { data, isLoading } = useQuery(salesOrdersQuery);
  const rows = (data ?? []) as Row[];
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const so = String(r.so_number ?? "").toLowerCase();
      const cust = String((r.customers as { name?: string } | null)?.name ?? "").toLowerCase();
      return so.includes(q) || cust.includes(q);
    });
  }, [rows, term]);

  const active = filtered.find((r) => String(r.id) === selected) ?? filtered[0] ?? null;
  const activeId = active ? String(active.id) : "";

  return (
    <>
      <PageHeader
        title="Audit Trail Sales Order"
        description="Telusuri riwayat perubahan per nomor SO secara kronologis: user, role, waktu, dan perpindahan status."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-xl border border-border/70 bg-surface/60 p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Cari no. SO atau customer"
              className="pl-9"
            />
          </div>
          <div className="max-h-[62vh] space-y-1.5 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="p-2 text-sm text-muted-foreground">Memuat sales order…</p>
            ) : filtered.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">Tidak ada SO yang cocok.</p>
            ) : (
              filtered.map((r) => {
                const id = String(r.id);
                const isActive = id === activeId;
                return (
                  <Button
                    key={id}
                    variant={isActive ? "secondary" : "ghost"}
                    onClick={() => setSelected(id)}
                    className="h-auto w-full flex-col items-start gap-1 px-3 py-2 text-left"
                  >
                    <span className="text-sm font-semibold">{String(r.so_number ?? "-")}</span>
                    <span className="text-xs text-muted-foreground">
                      {(r.customers as { name?: string } | null)?.name ?? "-"} ·{" "}
                      {formatDate(r.order_date as string)}
                    </span>
                  </Button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-surface/60 p-4">
          {active ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div>
                  <p className="text-sm font-semibold">{String(active.so_number ?? "-")}</p>
                  <p className="text-xs text-muted-foreground">
                    {(active.customers as { name?: string } | null)?.name ?? "-"} · dibutuhkan{" "}
                    {formatDate(active.required_date as string)}
                  </p>
                </div>
                <StatusBadge status={String(active.status ?? "-")} />
              </div>
              <SalesOrderAuditTrail soId={activeId} />
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <History className="size-4" /> Pilih salah satu sales order untuk melihat audit trail.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
