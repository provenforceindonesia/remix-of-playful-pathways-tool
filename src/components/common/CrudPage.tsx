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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export type Option = { value: string; label: string };

export type CrudField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "time" | "select" | "switch";
  options?: Option[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  full?: boolean;
  step?: string;
  readOnlyOnEdit?: boolean;
  createOnly?: boolean;
};

export type CrudRow = Record<string, unknown>;

export function toOptions(
  rows: CrudRow[] | undefined,
  labelKeys: string[] = ["name"],
  valueKey = "id",
): Option[] {
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
  headerActions,
  toolbar,
  children,
  pageSize,
  rowActions,
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
  headerActions?: ReactNode;
  toolbar?: ReactNode;
  children?: ReactNode;
  pageSize?: number;
  rowActions?: (row: T) => ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(() => emptyForm(fields));

  const invalidate = () =>
    invalidateKeys.forEach((k) => void qc.invalidateQueries({ queryKey: k }));

  const clean = (raw: Record<string, unknown>, isEdit: boolean) => {
    const src = beforePayload ? beforePayload(raw) : raw;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      const field = fields.find((f) => f.name === k);
      if (field?.createOnly && isEdit) continue;
      if (v === "" || v === undefined) {
        out[k] = null;
        continue;
      }
      out[k] = field?.type === "number" ? Number(v) : v;
    }
    return out;
  };

  const save = useMutation({
    mutationFn: async () => {
      const isEdit = Boolean(editing);
      const payload = clean(values, isEdit);
      if (isEdit) {
        const { error } = await db
          .from(table)
          .update(payload)
          .eq("id", String((editing as CrudRow).id));
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.from(table).insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Data diperbarui" : "Data ditambahkan");
      setOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (row: T) => {
      const q = db.from(table);
      const { error } = softDelete
        ? await q.update({ deleted_at: new Date().toISOString() }).eq("id", String(row.id))
        : await q.delete().eq("id", String(row.id));
      if (error) throw new Error(error.message);
    },

    onSuccess: () => {
      toast.success("Data dihapus");
      setDeleting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
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
            {canWrite && (
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
            {canDelete && (
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
  }, [columns, canWrite, canDelete, rowActions]);

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {headerActions}
            {canWrite && (
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
        exportName={exportName ?? table}
        toolbar={toolbar}
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
              .filter((f) => !(f.createOnly && editing))
              .map((f) => (
                <div key={f.name} className={cn("space-y-2", f.full && "sm:col-span-2")}>
                  <Label htmlFor={f.name}>
                    {f.label}
                    {f.required ? <span className="text-destructive"> *</span> : null}
                  </Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      id={f.name}
                      value={String(values[f.name] ?? "")}
                      required={f.required}
                      placeholder={f.placeholder}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    />
                  ) : f.type === "select" ? (
                    <Select
                      value={String(values[f.name] ?? "")}
                      onValueChange={(val) => setValues((v) => ({ ...v, [f.name]: val }))}
                    >
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
                        onCheckedChange={(c) => setValues((v) => ({ ...v, [f.name]: c }))}
                      />
                    </div>
                  ) : f.type === "date" || f.type === "time" || f.type === "datetime-local" ? (
                    <DateInput
                      id={f.name}
                      type={f.type}
                      value={String(values[f.name] ?? "")}
                      required={f.required}
                      placeholder={f.placeholder}
                      readOnly={Boolean(editing && f.readOnlyOnEdit)}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      id={f.name}
                      type={f.type === "number" ? "number" : (f.type ?? "text")}
                      step={f.step ?? (f.type === "number" ? "any" : undefined)}
                      value={String(values[f.name] ?? "")}
                      required={f.required}
                      placeholder={f.placeholder}
                      readOnly={Boolean(editing && f.readOnlyOnEdit)}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
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
