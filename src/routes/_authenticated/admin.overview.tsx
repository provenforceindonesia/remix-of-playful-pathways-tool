import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Database, ShieldCheck, Users, Activity } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { DataTable, type Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { seedDemoData } from "@/lib/seed.functions";
import {
  auditQuery,
  machinesQuery,
  productionEntriesQuery,
  profilesQuery,
  workOrdersQuery,
} from "@/lib/queries";
import { formatDateTime, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/overview")({
  head: () => ({
    meta: [
      { title: "System Overview — MANUFACTUREIQ" },
      { name: "description", content: "Ringkasan kesehatan sistem, pengguna aktif, dan aktivitas terbaru." },
      { property: "og:title", content: "System Overview — MANUFACTUREIQ" },
      { property: "og:description", content: "Monitoring kesehatan sistem MANUFACTUREIQ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OverviewPage,
});

type Row = Record<string, unknown>;

function OverviewPage() {
  const profiles = useQuery(profilesQuery);
  const machines = useQuery(machinesQuery);
  const wos = useQuery(workOrdersQuery);
  const entries = useQuery(productionEntriesQuery);
  const audit = useQuery(auditQuery);

  const seed = useMutation({
    mutationFn: async () => seedDemoData(),
    onSuccess: () => toast.success("Data demo disiapkan"),
    onError: (e: Error) => toast.error(e.message),
  });

  const users = (profiles.data ?? []) as Row[];
  const activeUsers = users.filter((u) => u.is_active).length;
  const machineRows = (machines.data ?? []) as Row[];
  const woRows = (wos.data ?? []) as Row[];
  const entryRows = (entries.data ?? []) as Row[];
  const pending = entryRows.filter(
    (e) => e.status === "Menunggu Validasi Production Control",
  ).length;

  const columns: Column<Row>[] = [
    { key: "created_at", header: "Waktu", render: (r) => formatDateTime(r.created_at as string) },
    { key: "username", header: "User" },
    { key: "entity", header: "Entitas" },
    { key: "action", header: "Aksi", render: (r) => <StatusBadge status={String(r.action ?? "-")} /> },
  ];

  return (
    <>
      <PageHeader
        title="System Overview"
        description="Kesehatan sistem, pemakaian modul, dan aktivitas terbaru."
        actions={
          <Button variant="outline" onClick={() => seed.mutate()} disabled={seed.isPending}>
            <Database className="size-4" />
            {seed.isPending ? "Menyiapkan..." : "Siapkan Data Demo"}
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="User Aktif" value={formatNumber(activeUsers)} icon={<Users className="size-4" />} tone="primary" />
        <KpiCard label="Mesin Terdaftar" value={formatNumber(machineRows.length)} icon={<Activity className="size-4" />} tone="info" />
        <KpiCard label="Work Order" value={formatNumber(woRows.length)} icon={<ShieldCheck className="size-4" />} tone="purple" />
        <KpiCard
          label="Menunggu Validasi"
          value={formatNumber(pending)}
          icon={<ShieldCheck className="size-4" />}
          tone={pending > 0 ? "warning" : "success"}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable<Row>
            columns={columns}
            rows={((audit.data ?? []) as Row[]).slice(0, 50)}
            loading={audit.isLoading}
            exportName="system-activity"
            searchable={false}
          />
        </CardContent>
      </Card>
    </>
  );
}
