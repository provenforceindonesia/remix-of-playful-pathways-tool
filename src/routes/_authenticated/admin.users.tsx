import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CrudPage, toOptions, type CrudField } from "@/components/common/CrudPage";
import type { Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  linesQuery,
  plantsQuery,
  profilesQuery,
  rolesQuery,
  shiftsQuery,
} from "@/lib/queries";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Manajemen User — MANUFACTUREIQ" },
      { name: "description", content: "Kelola pengguna, role, plant, line, dan shift default." },
      { property: "og:title", content: "Manajemen User — MANUFACTUREIQ" },
      { property: "og:description", content: "Administrasi pengguna dan hak akses sistem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

type Row = Record<string, unknown>;

function UsersPage() {
  const { data, isLoading } = useQuery(profilesQuery);
  const { data: roles } = useQuery(rolesQuery);
  const { data: plants } = useQuery(plantsQuery);
  const { data: lines } = useQuery(linesQuery);
  const { data: shifts } = useQuery(shiftsQuery);
  const rows = (data ?? []) as Row[];

  const columns: Column<Row>[] = [
    { key: "username", header: "Username" },
    { key: "full_name", header: "Nama Lengkap" },
    { key: "email", header: "Email" },
    {
      key: "role",
      header: "Role",
      value: (r) => (r.roles as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "plant",
      header: "Plant",
      value: (r) => (r.plants as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "line",
      header: "Line",
      value: (r) => (r.lines as { name?: string } | null)?.name ?? "-",
    },
    {
      key: "is_active",
      header: "Status",
      render: (r) => <StatusBadge status={r.is_active ? "Aktif" : "Nonaktif"} />,
    },
    { key: "created_at", header: "Dibuat", render: (r) => formatDate(r.created_at as string) },
  ];

  const fields: CrudField[] = [
    { name: "username", label: "Username", required: true },
    { name: "full_name", label: "Nama Lengkap", required: true },
    { name: "email", label: "Email", required: true },
    { name: "employee_code", label: "Kode Karyawan" },
    { name: "role_id", label: "Role", type: "select", options: toOptions(roles as Row[], ["name"]) },
    { name: "plant_id", label: "Plant", type: "select", options: toOptions(plants as Row[], ["name"]) },
    { name: "line_id", label: "Line", type: "select", options: toOptions(lines as Row[], ["name"]) },
    { name: "shift_id", label: "Shift Default", type: "select", options: toOptions(shifts as Row[], ["name"]) },
    { name: "is_active", label: "Aktif", type: "switch", defaultValue: true },
  ];

  return (
    <CrudPage<Row>
      title="Manajemen User"
      description="Pengguna hanya dapat dibuat lewat pendaftaran; di sini Anda mengatur profil dan hak aksesnya."
      table="profiles"
      invalidateKeys={[["profiles"]]}
      columns={columns}
      rows={rows}
      loading={isLoading}
      fields={fields}
      canWrite
      canDelete={false}
      exportName="user"
    />
  );
}
