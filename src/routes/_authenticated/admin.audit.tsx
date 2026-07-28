import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { auditQuery } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail — MANUFACTUREIQ" },
      { name: "description", content: "Jejak audit seluruh perubahan data penting di sistem." },
      { property: "og:title", content: "Audit Trail — MANUFACTUREIQ" },
      { property: "og:description", content: "Riwayat aktivitas pengguna dan perubahan data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuditPage,
});

type Row = Record<string, unknown>;

function AuditPage() {
  const { data, isLoading } = useQuery(auditQuery);
  const rows = (data ?? []) as Row[];

  const columns: Column<Row>[] = [
    { key: "created_at", header: "Waktu", render: (r) => formatDateTime(r.created_at as string) },
    { key: "username", header: "User" },
    { key: "role_code", header: "Role" },
    { key: "entity", header: "Entitas" },
    {
      key: "action",
      header: "Aksi",
      render: (r) => <StatusBadge status={String(r.action ?? "-")} />,
    },
    { key: "reason", header: "Keterangan" },
  ];

  return (
    <>
      <PageHeader
        title="Audit Trail"
        description="Setiap perubahan status dan data kritikal terekam otomatis."
      />
      <DataTable<Row>
        columns={columns}
        rows={rows}
        loading={isLoading}
        exportName="audit-trail"
        pageSize={15}
      />
    </>
  );
}
