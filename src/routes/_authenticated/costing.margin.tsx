import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hppQuery, productsQuery } from "@/lib/queries";
import { formatCurrency, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/costing/margin")({
  head: () => ({
    meta: [
      { title: "Margin Analysis — MANUFACTUREIQ" },
      { name: "description", content: "Analisis margin kontribusi per produk berdasarkan HPP standar dan nilai jual." },
      { property: "og:title", content: "Margin Analysis — MANUFACTUREIQ" },
      { property: "og:description", content: "Perbandingan HPP dan harga jual per produk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MarginPage,
});

type Row = Record<string, unknown>;
type Detail = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

function MarginPage() {
  const { data: versions, isLoading } = useQuery(hppQuery);
  const { data: products } = useQuery(productsQuery);

  const priceMap = useMemo(() => {
    const m = new Map<string, { name: string; price: number }>();
    ((products ?? []) as Row[]).forEach((p) =>
      m.set(String(p.id), {
        name: `${p.code ?? ""} — ${p.name ?? ""}`,
        price: num(p.standard_selling_value),
      }),
    );
    return m;
  }, [products]);

  const rows = useMemo(() => {
    const list = (versions ?? []) as Row[];
    const active = list.find((v) => v.status === "Aktif") ?? list[0];
    const details = ((active?.standard_hpp_details as Detail[]) ?? []) as Detail[];
    return details.map((d) => {
      const hpp = num(d.hpp_per_unit) || num(d.material_cost) + num(d.machine_cost) + num(d.labor_cost) + num(d.overhead_cost);
      const info = priceMap.get(String(d.product_id));
      const price = info?.price ?? 0;
      const margin = price - hpp;
      return {
        product: info?.name ?? (d.products as { name?: string } | null)?.name ?? "-",
        hpp,
        price,
        margin,
        margin_pct: price > 0 ? (margin / price) * 100 : 0,
        material_cost: num(d.material_cost),
        machine_cost: num(d.machine_cost),
        labor_cost: num(d.labor_cost),
        overhead_cost: num(d.overhead_cost),
      } as Record<string, unknown>;
    });
  }, [versions, priceMap]);

  const avgMargin = rows.length
    ? rows.reduce((s, r) => s + num(r.margin_pct), 0) / rows.length
    : 0;
  const negative = rows.filter((r) => num(r.margin) < 0).length;
  const bestProduct = [...rows].sort((a, b) => num(b.margin_pct) - num(a.margin_pct))[0];

  const chartData = rows
    .slice()
    .sort((a, b) => num(b.margin) - num(a.margin))
    .slice(0, 10)
    .map((r) => ({ name: String(r.product).slice(0, 18), HPP: num(r.hpp), Margin: num(r.margin) }));

  const columns: Column<Record<string, unknown>>[] = [
    { key: "product", header: "Produk" },
    { key: "material_cost", header: "Material", align: "right", render: (r) => formatCurrency(num(r.material_cost)) },
    { key: "machine_cost", header: "Mesin", align: "right", render: (r) => formatCurrency(num(r.machine_cost)) },
    { key: "labor_cost", header: "Tenaga Kerja", align: "right", render: (r) => formatCurrency(num(r.labor_cost)) },
    { key: "overhead_cost", header: "Overhead", align: "right", render: (r) => formatCurrency(num(r.overhead_cost)) },
    { key: "hpp", header: "HPP / Unit", align: "right", render: (r) => formatCurrency(num(r.hpp)) },
    { key: "price", header: "Harga Jual", align: "right", render: (r) => formatCurrency(num(r.price)) },
    { key: "margin", header: "Margin", align: "right", render: (r) => formatCurrency(num(r.margin)) },
    {
      key: "margin_pct",
      header: "Margin %",
      align: "right",
      render: (r) => (
        <StatusBadge
          status={formatPercent(num(r.margin_pct))}
          tone={num(r.margin_pct) < 0 ? "danger" : num(r.margin_pct) < 15 ? "warning" : "success"}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Margin Analysis"
        description="Kontribusi margin per produk berdasarkan versi HPP standar aktif."
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Rata-rata Margin" value={formatPercent(avgMargin)} tone={avgMargin < 0 ? "danger" : "success"} />
        <KpiCard label="Produk Margin Negatif" value={negative} tone={negative ? "danger" : "success"} />
        <KpiCard
          label="Margin Tertinggi"
          value={bestProduct ? String(bestProduct.product) : "-"}
          tone="primary"
        />
      </div>
      {chartData.length > 0 && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>HPP vs Margin (Top 10)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="HPP" stackId="a" fill="var(--color-primary)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Margin" stackId="a" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      <DataTable columns={columns} rows={rows} loading={isLoading} exportName="margin-analysis" />
    </>
  );
}
