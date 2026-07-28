import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { permissionsQuery, rolePermissionsQuery, rolesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — MANUFACTUREIQ" },
      { name: "description", content: "Atur matriks hak akses tiap role pada seluruh modul." },
      { property: "og:title", content: "Roles & Permissions — MANUFACTUREIQ" },
      { property: "og:description", content: "Matriks hak akses role manufaktur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RolesPage,
});

type Row = Record<string, unknown>;

function RolesPage() {
  const qc = useQueryClient();
  const { data: roles } = useQuery(rolesQuery);
  const { data: permissions } = useQuery(permissionsQuery);
  const { data: rolePerms } = useQuery(rolePermissionsQuery);
  const [roleId, setRoleId] = useState<string>("");

  const roleList = (roles ?? []) as Row[];
  const permList = (permissions ?? []) as Row[];
  const activeRole = roleId || String(roleList[0]?.id ?? "");

  const granted = useMemo(() => {
    const set = new Set<string>();
    ((rolePerms ?? []) as Row[])
      .filter((rp) => String(rp.role_id) === activeRole)
      .forEach((rp) => set.add(String(rp.permission_id)));
    return set;
  }, [rolePerms, activeRole]);

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    permList.forEach((p) => {
      const key = String(p.module ?? "Lainnya");
      map.set(key, [...(map.get(key) ?? []), p]);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [permList]);

  const toggle = useMutation({
    mutationFn: async ({ permissionId, on }: { permissionId: string; on: boolean }) => {
      if (on) {
        const { error } = await supabase
          .from("role_permissions")
          .insert({ role_id: activeRole, permission_id: permissionId });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", activeRole)
          .eq("permission_id", permissionId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["role_permissions"] });
      toast.success("Hak akses diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="Centang izin untuk memberi akses modul kepada role tertentu."
        actions={
          <Select value={activeRole} onValueChange={setRoleId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Pilih role" />
            </SelectTrigger>
            <SelectContent>
              {roleList.map((r) => (
                <SelectItem key={String(r.id)} value={String(r.id)}>
                  {String(r.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {roleList.map((r) => (
          <Button
            key={String(r.id)}
            size="sm"
            variant={String(r.id) === activeRole ? "default" : "outline"}
            onClick={() => setRoleId(String(r.id))}
          >
            {String(r.code)}
            {r.is_readonly ? <StatusBadge status="Read Only" tone="neutral" /> : null}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {grouped.map(([module, perms]) => (
          <Card key={module}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wide">{module}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {perms.map((p) => {
                const id = String(p.id);
                const on = granted.has(id);
                return (
                  <label key={id} className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={on}
                      disabled={toggle.isPending}
                      onCheckedChange={(c) => toggle.mutate({ permissionId: id, on: Boolean(c) })}
                    />
                    <span>
                      <span className="font-medium">{String(p.action)}</span>
                      <span className="block text-xs text-muted-foreground">{String(p.code)}</span>
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
