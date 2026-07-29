import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/common/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import {
  productionPlansQuery,
  profilesQuery,
  routingsQuery,
  workOrdersQuery,
} from "@/lib/queries";
import {
  formatCurrency,
  formatDate,
  formatFullDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/format";

type Row = Record<string, unknown>;
type Item = {
  id?: string;
  quantity?: number;
  fulfilled_qty?: number;
  unit_price?: number;
  products?: { code?: string; name?: string } | null;
  product_variants?: { name?: string } | null;
  units_of_measure?: { code?: string } | null;
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-border/70 bg-surface/60 p-4">
    <p className="mb-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
      {title}
    </p>
    {children}
  </section>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="space-y-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="text-sm font-medium">{value ?? "-"}</div>
  </div>
);

const RowLine = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/40 py-1.5 text-sm last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="tabular font-medium">{value}</span>
  </div>
);

export function SalesOrderDetailDialog({
  order,
  onClose,
  onApprove,
  onRevise,
}: {
  order: Row | null;
  onClose: () => void;
  onApprove?: (order: Row) => void;
  onRevise?: (order: Row) => void;
}) {
  const open = Boolean(order);
  const soId = order ? String(order.id) : "";
  const status = String(order?.status ?? "");
  const isPending = ["Menunggu Review Produksi", "Perlu Revisi", "Draft"].includes(status);

  const { data: profiles } = useQuery({ ...profilesQuery, enabled: open });
  const { data: plans } = useQuery({ ...productionPlansQuery, enabled: open });
  const { data: wos } = useQuery({ ...workOrdersQuery, enabled: open });
  const { data: routings } = useQuery({ ...routingsQuery, enabled: open && isPending });
  const { data: history } = useQuery({
    queryKey: ["approval_history", "sales_orders", soId],
    enabled: open && Boolean(soId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_history")
        .select("*")
        .eq("entity", "sales_orders")
        .eq("record_id", soId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });

  const person = (id: unknown) => {
    const p = ((profiles ?? []) as Row[]).find((x) => String(x.id) === String(id ?? ""));
    if (!p) return null;
    const role = (p.roles as { name?: string } | null)?.name;
    return `${String(p.full_name ?? p.username ?? "-")}${role ? ` · ${role}` : ""}`;
  };

  const items = useMemo(() => ((order?.sales_order_items as Item[]) ?? []) as Item[], [order]);
  const totalQty = items.reduce((s, i) => s + Number(i.quantity ?? 0), 0);
  const totalValue = items.reduce(
    (s, i) => s + Number(i.quantity ?? 0) * Number(i.unit_price ?? 0),
    0,
  );
  const pct = Number(order?.progress_pct ?? 0);
  const fulfilledSum = items.reduce((s, i) => s + Number(i.fulfilled_qty ?? 0), 0);
  const fulfilledQty = fulfilledSum > 0 ? fulfilledSum : Math.round((totalQty * pct) / 100);
  const remainingQty = Math.max(0, totalQty - fulfilledQty);
  const fulfilledValue = totalQty > 0 ? (totalValue * fulfilledQty) / totalQty : 0;

  const relatedPlans = ((plans ?? []) as Row[]).filter(
    (p) => String(p.sales_order_id ?? "") === soId,
  );
  const relatedWos = ((wos ?? []) as Row[]).filter((w) => String(w.sales_order_id ?? "") === soId);

  const required = order?.required_date ? new Date(String(order.required_date)) : null;
  const confirmed = order?.confirmed_delivery_date
    ? new Date(String(order.confirmed_delivery_date))
    : null;
  const lateDays =
    required && confirmed
      ? Math.max(
          0,
          Math.round(
            (new Date(confirmed.getFullYear(), confirmed.getMonth(), confirmed.getDate()).getTime() -
              new Date(required.getFullYear(), required.getMonth(), required.getDate()).getTime()) /
              86400000,
          ),
        )
      : 0;

  const timeline = useMemo(() => {
    const list = ((history ?? []) as Row[]).map((h) => ({
      at: String(h.created_at ?? ""),
      text: `${String(h.action ?? "Perubahan status")}${h.to_status ? ` → ${String(h.to_status)}` : ""}${
        person(h.actor_id) ? ` oleh ${person(h.actor_id)}` : ""
      }`,
    }));
    if (list.length) return list;
    const fallback: { at: string; text: string }[] = [];
    if (order?.created_at)
      fallback.push({
        at: String(order.created_at),
        text: `Order dibuat${person(order.created_by) ? ` oleh ${person(order.created_by)}` : ""}`,
      });
    if (order?.submitted_at)
      fallback.push({ at: String(order.submitted_at), text: "Order dikirim untuk review produksi" });
    if (order?.approved_at)
      fallback.push({
        at: String(order.approved_at),
        text: `Order dikonfirmasi${person(order.approved_by) ? ` oleh ${person(order.approved_by)}` : ""}`,
      });
    relatedPlans.forEach((p) =>
      fallback.push({
        at: String(p.created_at ?? ""),
        text: `Production Plan ${String(p.plan_number ?? "-")} dibuat`,
      }),
    );
    relatedWos.forEach((w) =>
      fallback.push({
        at: String(w.created_at ?? ""),
        text: `Work Order ${String(w.wo_number ?? "-")} dibuat`,
      }),
    );
    return fallback.sort((a, b) => a.at.localeCompare(b.at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, order, profiles, plans, wos]);

  const plan = relatedPlans[0] as Row | undefined;
  const readinessTone = (v: string) =>
    /siap|tersedia|ready|ok/i.test(v)
      ? "bg-success/10 text-success"
      : /kurang|tidak|belum tersedia|shortage/i.test(v)
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  const materialReadiness = plan ? String(plan.material_readiness ?? "-") : "Belum Diperiksa";
  const capacityReadiness = plan ? String(plan.capacity_readiness ?? "-") : "Belum Diperiksa";
  const orderProductIds = new Set(
    items.map((i) => String((i as { product_id?: string }).product_id ?? "")),
  );
  const routingReady = ((routings ?? []) as Row[]).some(
    (r) => orderProductIds.has(String(r.product_id ?? "")) && String(r.status ?? "") !== "Draft",
  );

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail Sales Order</DialogTitle>
          <DialogDescription>
            {isPending
              ? "Periksa detail pesanan, kebutuhan customer, dan kesiapan awal sebelum mengonfirmasi tanggal pemenuhan."
              : "Informasi lengkap pesanan, nilai order, jadwal pemenuhan, dan perkembangan produksinya."}
          </DialogDescription>
        </DialogHeader>


        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={String(order.status)} />
            <StatusBadge status={String(order.priority)} />
          </div>

          <Section title="Ringkasan Order">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="No. Sales Order" value={String(order.so_number ?? "-")} />
              <Field
                label="Customer"
                value={(order.customers as { name?: string } | null)?.name ?? "-"}
              />
              <Field label="Dibuat pada" value={formatFullDateTime(order.created_at as string)} />
              <Field label="Dibuat oleh" value={person(order.created_by) ?? "-"} />
            </div>
          </Section>

          <Section title="Informasi Customer">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Customer"
                value={(order.customers as { name?: string } | null)?.name ?? "-"}
              />
              <Field
                label="Referensi PO Customer"
                value={String(order.customer_po_ref ?? "-") || "-"}
              />
              <div className="sm:col-span-2">
                <Field
                  label="Catatan Customer"
                  value={String(order.customer_note ?? "") || "Tidak ada catatan"}
                />
              </div>
            </div>
          </Section>

          <Section title="Rincian Item">
            <div className="space-y-3">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada item.</p>
              ) : (
                items.map((it, idx) => (
                  <div
                    key={it.id ?? idx}
                    className="rounded-lg border border-border/60 bg-background/40 p-3"
                  >
                    <RowLine label="Produk" value={it.products?.name ?? "-"} />
                    <RowLine label="Kode Produk" value={it.products?.code ?? "-"} />
                    <RowLine label="Varian" value={it.product_variants?.name ?? "-"} />
                    <RowLine
                      label="Quantity"
                      value={`${formatNumber(Number(it.quantity ?? 0))} ${it.units_of_measure?.code ?? "pcs"}`}
                    />
                    <RowLine
                      label="Harga Satuan"
                      value={`${formatCurrency(Number(it.unit_price ?? 0))}/${it.units_of_measure?.code ?? "pcs"}`}
                    />
                    <RowLine
                      label="Nilai Item"
                      value={formatCurrency(
                        Number(it.quantity ?? 0) * Number(it.unit_price ?? 0),
                      )}
                    />
                  </div>
                ))
              )}
              <RowLine label="Total Nilai Order" value={formatCurrency(totalValue)} />
            </div>
          </Section>

          {isPending ? (
            <>
              <Section title="Permintaan Pemenuhan">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Tanggal Order" value={formatDate(order.order_date as string)} />
                  <Field
                    label="Tanggal Dibutuhkan Customer"
                    value={formatDate(order.required_date as string)}
                  />
                  <Field label="Tanggal Pemenuhan Dikonfirmasi" value="Belum ditetapkan" />
                  <Field
                    label="Status Review Produksi"
                    value={
                      status === "Perlu Revisi"
                        ? "Dikembalikan untuk revisi Sales"
                        : "Menunggu pemeriksaan Production Control"
                    }
                  />
                </div>
              </Section>

              <Section title="Hasil Pemeriksaan Produksi">
                <div className="space-y-2">
                  {[
                    { label: "Ketersediaan Material", value: materialReadiness },
                    { label: "Ketersediaan Kapasitas", value: capacityReadiness },
                    {
                      label: "Routing dan Standar Produksi",
                      value: routingReady ? "Tersedia" : "Belum Diperiksa",
                    },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">{c.label}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${readinessTone(c.value)}`}
                      >
                        {c.value}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Field
                      label="Catatan Production Control"
                      value={String(order.revision_note ?? "") || "Belum ada catatan"}
                    />
                  </div>
                </div>
              </Section>
            </>
          ) : (
            <>
              <Section title="Jadwal Pemenuhan">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Tanggal Order" value={formatDate(order.order_date as string)} />
                  <Field
                    label="Tanggal Dibutuhkan Customer"
                    value={formatDate(order.required_date as string)}
                  />
                  <Field
                    label="Tanggal Pemenuhan Dikonfirmasi"
                    value={
                      order.confirmed_delivery_date
                        ? formatDate(order.confirmed_delivery_date as string)
                        : "Belum ditetapkan"
                    }
                  />
                  <Field
                    label="Dikonfirmasi pada"
                    value={formatFullDateTime(order.approved_at as string)}
                  />
                  <Field label="Dikonfirmasi oleh" value={person(order.approved_by) ?? "-"} />
                </div>
                {confirmed ? (
                  lateDays > 0 ? (
                    <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive">
                      <AlertTriangle className="size-3.5" /> Terlambat {lateDays} hari — Order
                      Berisiko
                    </p>
                  ) : (
                    <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success">
                      <Check className="size-3.5" /> Sesuai kebutuhan customer
                    </p>
                  )
                ) : null}
              </Section>

              <Section title="Progress Pemenuhan">
                <RowLine
                  label="Finished Good Tervalidasi"
                  value={`${formatNumber(fulfilledQty)} pcs`}
                />
                <RowLine label="Quantity Sales Order" value={`${formatNumber(totalQty)} pcs`} />
                <RowLine label="Sisa Belum Terpenuhi" value={`${formatNumber(remainingQty)} pcs`} />
                <div className="my-3 flex items-center gap-3">
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className="text-sm font-semibold">{formatPercent(pct)}</span>
                </div>
                <RowLine label="Nilai Sudah Terpenuhi" value={formatCurrency(fulfilledValue)} />
                <RowLine
                  label="Nilai Belum Terpenuhi"
                  value={formatCurrency(Math.max(0, totalValue - fulfilledValue))}
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status Pemenuhan</span>
                  <StatusBadge status={String(order.status)} />
                </div>
              </Section>

              <Section title="Keterkaitan Produksi">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Production Plan</p>
                      <p className="text-sm font-medium">
                        {relatedPlans.length
                          ? relatedPlans.map((p) => String(p.plan_number ?? "-")).join(", ")
                          : "Belum dibuat"}
                      </p>
                    </div>
                    {relatedPlans.length ? (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/production/plans">Lihat Plan</Link>
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Work Order</p>
                      <p className="text-sm font-medium">
                        {relatedWos.length
                          ? relatedWos.map((w) => String(w.wo_number ?? "-")).join(", ")
                          : "Belum dibuat"}
                      </p>
                    </div>
                    {relatedWos.length ? (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/production/work-orders">Lihat WO</Link>
                      </Button>
                    ) : null}
                  </div>
                  <div className="pt-1">
                    <Field
                      label="Catatan Production Control"
                      value={String(order.revision_note ?? "") || "Tidak ada catatan"}
                    />
                  </div>
                </div>
              </Section>
            </>
          )}


          <Section title="Riwayat Status">
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{formatFullDateTime(t.at)}</p>
                      <p className="text-sm">{t.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          {isPending ? (
            <>
              {onRevise ? (
                <Button variant="outline" onClick={() => onRevise(order)}>
                  Kembalikan untuk Revisi
                </Button>
              ) : null}
              {onApprove ? <Button onClick={() => onApprove(order)}>Konfirmasi Order</Button> : null}
            </>
          ) : (
            <Button asChild>
              <Link to="/production/plans">Buka Production Plan</Link>
            </Button>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
