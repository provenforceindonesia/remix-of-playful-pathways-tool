import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, type Column } from "./DataTable";
import { DateInput } from "./DateInput";
import { PageHeader } from "./PageHeader";
import { cn } from "@/lib/utils";
import { recordAudit } from "@/lib/audit";
import { useAuth } from "@/lib/auth";

export type Option = { value: string; label: string };

export type CrudField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "datetime-local" | "time" | "select" | "switch" | "custom";
  /** Renderer for type: "custom" fields. */
  render?: (ctx: {
    value: unknown;
    setValue: (v: unknown) => void;
    values: Record<string, unknown>;
    editing: boolean;
  }) => ReactNode;
  options?: Option[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  full?: boolean;
  step?: string;
  readOnlyOnEdit?: boolean;
  readOnly?: boolean;
  createOnly?: boolean;
  editOnly?: boolean;
  /** Not sent to the table payload (used for side-effect inserts). */
  virtual?: boolean;
};

export type CrudRow = Record<string, unknown>;

export function toOptions(rows: CrudRow[] | undefined, labelKeys: string[] = ["name"], valueKey = "id"): Option[] {
  return (rows ?? []).map((r) => ({
    value: String(r[valueKey] ?? ""),
    label: labelKeys
      .map((k) => r[k])
      .filter(Boolean)
      .join(" — "),
  }));
}

export function selectOptions(values: readonly string[]): Option[] {
  return values.map((v) => ({ value: v, label: v }));
}

function emptyForm(fields: CrudField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) out[f.name] = f.defaultValue ?? (f.type === "switch" ? true : "");
  return out;
}

export function CrudPage<T extends CrudRow>({
  title,
  description,
  table,
  invalidateKeys,
  columns,
  rows,
  loading,
  fields,
  canWrite = true,
  canDelete = true,
  softDelete,
  beforePayload,
  toRowValues,
  exportName,
  exportable = true,
  headerActions,
  toolbar,
  createInToolbar,
  children,
  pageSize,
  rowActions,
  rowCanEdit,
  rowCanDelete,
  afterCreate,
  afterUpdate,
  onFieldChange,
}: {
  title: string;
  description?: string;
  table: string;
  invalidateKeys: string[][];
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  fields: CrudField[];
  canWrite?: boolean;
  canDelete?: boolean;
  softDelete?: boolean;
  beforePayload?: (values: Record<string, unknown>) => Record<string, unknown>;
  toRowValues?: (row: T) => Record<string, unknown>;
  exportName?: string;
  exportable?: boolean;
  headerActions?: ReactNode;
  toolbar?: ReactNode;
  createInToolbar?: boolean;
  children?: ReactNode;
  pageSize?: number;
  rowActions?: (row: T) => ReactNode;
  rowCanEdit?: (row: T) => boolean;
  rowCanDelete?: (row: T) => boolean;

  /** Runs after a successful insert, with the created row and raw form values. */
  afterCreate?: (created: CrudRow, values: Record<string, unknown>) => Promise<void> | void;
  /** Runs after a successful update, with the edited row and raw form values. */
  afterUpdate?: (updated: CrudRow, values: Record<string, unknown>) => Promise<void> | void;
  /** Returns extra values to patch when a field changes (e.g. dependent fields). */
  onFieldChange?: (name: string, value: unknown, values: Record<string, unknown>) => Record<string, unknown> | void;
}) {
  const qc = useQueryClient();
  const { profile, role } = useAuth();
  const actor = {
    id: profile?.id ?? null,
    username: profile?.username ?? null,
    role: role ?? null,
    plant_id: profile?.plant_id ?? null,
  };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(() => emptyForm(fields));

  const setValue = (name: string, value: unknown) =>
    setValues((v) => ({ ...v, [name]: value, ...(onFieldChange?.(name, value, v) ?? {}) }));

  const invalidate = () => invalidateKeys.forEach((k) => void qc.invalidateQueries({ queryKey: k }));

  const clean = (raw: Record<string, unknown>, isEdit: boolean) => {
    const src = beforePayload ? beforePayload(raw) : raw;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      const field = fields.find((f) => f.name === k);
      if (field?.virtual) continue;
      if (field?.createOnly && isEdit) continue;
      if (field?.editOnly && !isEdit) continue;
      // Let database defaults generate read-only values (for example
      // products.code) instead of explicitly overriding the default with NULL.
      if (!isEdit && field?.readOnly && (v === "" || v === undefined || v === null)) {
        continue;
      }
      if (v === "" || v === undefined) {
        out[k] = null;
        continue;
      }
      out[k] = field?.type === "number" ? Number(v) : v;
    }
    return out;
  };

  /** Required fields (incl. custom renderers, which have no native validation). */
  const missingRequired = (isEdit: boolean) =>
    fields
      .filter(
        (f) =>
          f.required &&
          !f.virtual &&
          !(f.createOnly && isEdit) &&
          !(f.editOnly && !isEdit) &&
          f.type !== "switch" &&
          (values[f.name] === "" || values[f.name] === null || values[f.name] === undefined),
      )
      .map((f) => f.label);

  const save = useMutation({
    mutationFn: async () => {
      const isEdit = Boolean(editing);
      const missing = missingRequired(isEdit);
      if (missing.length) throw new Error(`Lengkapi field wajib: ${missing.join(", ")}`);
      const payload = clean(values, isEdit);
      if (isEdit) {
        const before = editing as CrudRow;
        const { error } = await db
          .from(table)
          .update(payload)
          .eq("id", String((editing as CrudRow).id));
        if (error) throw new Error(error.message);
        if (afterUpdate) await afterUpdate(editing as CrudRow, values);
        await recordAudit(actor, {
          entity: table,
          recordId: String(before.id ?? ""),
          action: "UPDATE",
          fromStatus: before.status ? String(before.status) : null,
          toStatus: payload.status ? String(payload.status) : null,
          before,
          after: payload,
        });
      } else {
        const { data, error } = await db.from(table).insert(payload).select().single();
        if (error) throw new Error(error.message);
        if (afterCreate) await afterCreate((data ?? {}) as CrudRow, values);
        await recordAudit(actor, {
          entity: table,
          recordId: data?.id ? String(data.id) : null,
          action: "CREATE",
          toStatus: payload.status ? String(payload.status) : null,
          after: (data ?? payload) as Record<string, unknown>,
        });
      }
    },
    onSuccess: () => {
      toast.success(editing ? `${title} diperbarui` : `${title} ditambahkan`, {
        description: "Perubahan tercatat pada audit trail.",
      });
      setOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error("Gagal menyimpan data", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (row: T) => {
      const q = db.from(table);
      const { error } = softDelete
        ? await q.update({ deleted_at: new Date().toISOString() }).eq("id", String(row.id))
        : await q.delete().eq("id", String(row.id));
      if (error) throw new Error(error.message);
      await recordAudit(actor, {
        entity: table,
        recordId: String(row.id),
        action: softDelete ? "SOFT_DELETE" : "DELETE",
        fromStatus: row.status ? String(row.status) : null,
        before: row as CrudRow,
      });
    },

    onSuccess: () => {
      toast.success(`${title} dihapus`, { description: "Aksi tercatat pada audit trail." });
      setDeleting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error("Gagal menghapus data", { description: e.message }),
  });

  const openCreate = () => {
    setEditing(null);
    setValues(emptyForm(fields));
    setOpen(true);
  };

  const openEdit = (row: T) => {
    const base = emptyForm(fields);
    const src = toRowValues ? toRowValues(row) : (row as CrudRow);
    for (const f of fields) {
      const v = src[f.name];
      base[f.name] = v === null || v === undefined ? base[f.name] : v;
    }
    setEditing(row);
    setValues(base);
    setOpen(true);
  };

  const allColumns = useMemo<Column<T>[]>(() => {
    if (!canWrite && !canDelete && !rowActions) return columns;
    return [
      ...columns,
      {
        key: "__actions",
        header: "Aksi",
        align: "right",
        sortable: false,
        render: (row) => (
          <div className="flex justify-end gap-1">
            {rowActions?.(row)}
            {canWrite && (rowCanEdit?.(row) ?? true) && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(row);
                }}
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {canDelete && (rowCanDelete?.(row) ?? true) && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleting(row);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, canWrite, canDelete, rowActions, rowCanEdit, rowCanDelete]);

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {headerActions}
            {canWrite && !createInToolbar && (
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Tambah
              </Button>
            )}
          </>
        }
      />

      {children}

      <DataTable<T>
        columns={allColumns}
        rows={rows}
        loading={loading}
        exportName={exportable ? (exportName ?? table) : undefined}
        toolbar={toolbar}
        toolbarActions={
          canWrite && createInToolbar ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Tambah
            </Button>
          ) : null
        }
        pageSize={pageSize}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Ubah ${title}` : `Tambah ${title}`}</DialogTitle>
            <DialogDescription>Lengkapi data di bawah lalu simpan.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            id="crud-form"
          >
            {fields
              .filter((f) => !(f.createOnly && editing) && !(f.editOnly && !editing))
              .map((f) => (
                <div key={f.name} className={cn("space-y-2", f.full && "sm:col-span-2")}>
                  <Label htmlFor={f.name}>
                    {f.label}
                    {f.required ? <span className="text-destructive"> *</span> : null}
                  </Label>
                  {f.type === "custom" ? (
                    f.render?.({
                      value: values[f.name],
                      setValue: (v) => setValue(f.name, v),
                      values,
                      editing: Boolean(editing),
                    })
                  ) : f.type === "textarea" ? (
                    <Textarea
                      id={f.name}
                      value={String(values[f.name] ?? "")}
                      required={f.required}
                      placeholder={f.placeholder}
                      onChange={(e) => setValue(f.name, e.target.value)}
                    />
                  ) : f.type === "select" ? (
                    <Select value={String(values[f.name] ?? "")} onValueChange={(val) => setValue(f.name, val)}>
                      <SelectTrigger id={f.name} className="w-full">
                        <SelectValue placeholder={f.placeholder ?? "Pilih..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {(f.options ?? []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : f.type === "switch" ? (
                    <div className="flex h-9 items-center">
                      <Switch
                        id={f.name}
                        checked={Boolean(values[f.name])}
                        onCheckedChange={(c) => setValue(f.name, c)}
                      />
                    </div>
                  ) : f.type === "date" || f.type === "time" || f.type === "datetime-local" ? (
                    <DateInput
                      id={f.name}
                      type={f.type}
                      value={String(values[f.name] ?? "")}
                      required={f.required}
                      placeholder={f.placeholder}
                      readOnly={Boolean(f.readOnly || (editing && f.readOnlyOnEdit))}
                      className={cn(
                        Boolean(f.readOnly || (editing && f.readOnlyOnEdit)) && "bg-muted/40 text-muted-foreground",
                      )}
                      onChange={(e) => setValue(f.name, e.target.value)}
                    />
                  ) : (
                    <Input
                      id={f.name}
                      type={f.type === "number" ? "number" : (f.type ?? "text")}
                      step={f.step ?? (f.type === "number" ? "any" : undefined)}
                      value={String(values[f.name] ?? "")}
                      required={f.required}
                      placeholder={f.placeholder}
                      readOnly={Boolean(f.readOnly || (editing && f.readOnlyOnEdit))}
                      className={cn(
                        Boolean(f.readOnly || (editing && f.readOnlyOnEdit)) && "bg-muted/40 text-muted-foreground",
                      )}
                      onChange={(e) => setValue(f.name, e.target.value)}
                    />
                  )}
                </div>
              ))}
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" form="crud-form" disabled={save.isPending}>
              {save.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan dan akan tercatat pada audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && remove.mutate(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
