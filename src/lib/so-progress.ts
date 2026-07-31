export type SoItem = {
  id?: string;
  quantity?: number | null;
  fulfilled_qty?: number | null;
  unit_price?: number | null;
  products?: { code?: string; name?: string } | null;
  product_variants?: { name?: string } | null;
  units_of_measure?: { code?: string } | null;
};

export type ItemProgress = {
  id: string;
  productName: string;
  variantName: string;
  uom: string;
  qty: number;
  fulfilled: number;
  remaining: number;
  pct: number;
  unitPrice: number;
  itemValue: number;
  fulfilledValue: number;
  remainingValue: number;
};

/** Progress pemenuhan per item Sales Order (quantity antarproduk tidak digabung). */
export function computeItemProgress(items: SoItem[]): ItemProgress[] {
  return (items ?? []).map((it, idx) => {
    const qty = Number(it.quantity ?? 0);
    const fulfilledRaw = Number(it.fulfilled_qty ?? 0);
    const fulfilled = Math.max(0, fulfilledRaw);
    const unitPrice = Number(it.unit_price ?? 0);
    const remaining = Math.max(qty - fulfilled, 0);
    const pct = qty > 0 ? Math.min((fulfilled / qty) * 100, 100) : 0;
    return {
      id: String(it.id ?? idx),
      productName: it.products?.name ?? "-",
      variantName: it.product_variants?.name ?? "Standard",
      uom: it.units_of_measure?.code ?? "pcs",
      qty,
      fulfilled,
      remaining,
      pct,
      unitPrice,
      itemValue: qty * unitPrice,
      fulfilledValue: Math.min(fulfilled, qty) * unitPrice,
      remainingValue: remaining * unitPrice,
    };
  });
}

export type SoValueSummary = {
  totalValue: number;
  fulfilledValue: number;
  remainingValue: number;
  valuePct: number;
};

/** Ringkasan nilai pemenuhan Sales Order (progress berbasis nilai, bukan quantity). */
export function computeValueSummary(items: SoItem[]): SoValueSummary {
  const rows = computeItemProgress(items);
  const totalValue = rows.reduce((s, r) => s + r.itemValue, 0);
  const fulfilledValue = rows.reduce((s, r) => s + r.fulfilledValue, 0);
  const remainingValue = rows.reduce((s, r) => s + r.remainingValue, 0);
  return {
    totalValue,
    fulfilledValue,
    remainingValue,
    valuePct: totalValue > 0 ? Math.min((fulfilledValue / totalValue) * 100, 100) : 0,
  };
}

/** Progress ringkas untuk data table: berbasis nilai order; 0% bila total nilai Rp0. */
export function soValueProgress(row: { sales_order_items?: SoItem[] | null }): number {
  const items = (row?.sales_order_items ?? []) as SoItem[];
  if (!items.length) return 0;
  return computeValueSummary(items).valuePct;
}
