import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Database, Radio, Table2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiCard } from "@/components/common/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getConnectionStatus } from "@/lib/connection-status.functions";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/connection-status")({
  head: () => ({
    meta: [
      { title: "Status Koneksi — MANUFACTUREIQ" },
      {
        name: "description",
        content: "Status koneksi backend: Auth, Database, Realtime, dan jumlah tabel.",
      },
      { property: "og:title", content: "Status Koneksi — MANUFACTUREIQ" },
      {
        property: "og:description",
        content: "Status koneksi backend MANUFACTUREIQ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectionStatusPage,
});

function StatusCard({
  label,
  active,
  detail,
  icon,
}: {
  label: string;
  active: boolean;
  detail?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <span
        className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${active ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          {active ? "Aktif" : "Tidak aktif"}
          {detail ? ` · ${detail}` : ""}
        </p>
      </div>
      <span
        className={`size-2.5 rounded-full ${active ? "bg-success" : "bg-destructive"}`}
      />
    </div>
  );
}

function ConnectionStatusPage() {
  const fetchStatus = useServerFn(getConnectionStatus);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["connection-status"],
    queryFn: () => fetchStatus(),
  });

  return (
    <>
      <PageHeader
        title="Status Koneksi"
        description="Kondisi terkini Auth, Database, Realtime, dan jumlah tabel public."
        actions={
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`size-4 ${isFetching ? "animate-spin" : ""}`}
            />
            {isFetching ? "Memeriksa..." : "Refresh"}
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <KpiCard
          label="Status Auth"
          value={isLoading ? "..." : data?.auth.active ? "Aktif" : "Mati"}
          icon={<ShieldCheck className="size-4" />}
          tone={data?.auth.active ? "success" : "danger"}
        />
        <KpiCard
          label="Status Database"
          value={isLoading ? "..." : data?.database.active ? "Aktif" : "Mati"}
          icon={<Database className="size-4" />}
          tone={data?.database.active ? "success" : "danger"}
        />
        <KpiCard
          label="Status Realtime"
          value={isLoading ? "..." : data?.realtime.active ? "Aktif" : "Mati"}
          icon={<Radio className="size-4" />}
          tone={data?.realtime.active ? "success" : "danger"}
        />
        <KpiCard
          label="Jumlah Tabel Public"
          value={isLoading ? "..." : data?.tables.count ?? 0}
          icon={<Table2 className="size-4" />}
          tone="info"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Rincian Koneksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusCard
              label="Autentikasi"
              active={!!data?.auth.active}
              detail={data?.auth.email ?? undefined}
              icon={<ShieldCheck className="size-5" />}
            />
            <StatusCard
              label="Database"
              active={!!data?.database.active}
              detail={data?.database.error ?? undefined}
              icon={<Database className="size-5" />}
            />
            <StatusCard
              label="Realtime"
              active={!!data?.realtime.active}
              icon={<Radio className="size-5" />}
            />
            <StatusCard
              label="Tabel Public"
              active={!data?.tables.error}
              detail={
                data?.tables.error
                  ? data.tables.error
                  : `${data?.tables.count ?? 0} tabel terdeteksi`
              }
              icon={<Table2 className="size-5" />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Metadata Pemeriksaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Terakhir diperiksa</span>
              <span className="font-medium text-foreground">
                {data?.checkedAt ? formatDateTime(data.checkedAt) : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-medium text-foreground">
                {data?.auth.userId ?? "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-foreground">
                {data?.auth.email ?? "-"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
