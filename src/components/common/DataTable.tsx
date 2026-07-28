import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, LoadingBlock } from "./PageHeader";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  value?: (row: T) => string | number | null | undefined;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  className?: string;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  loading,
  pageSize = 10,
  searchable = true,
  exportName,
  emptyTitle,
  onRowClick,
  toolbar,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  pageSize?: number;
  searchable?: boolean;
  exportName?: string;
  emptyTitle?: string;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const val = (row: T, col: Column<T>) =>
    col.value ? col.value(row) : ((row[col.key] as string | number | null | undefined) ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = rows.filter((r) =>
        columns.some((c) =>
          String(val(r, c) ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        out = [...out].sort((a, b) => {
          const av = val(a, col);
          const bv = val(b, col);
          const na = Number(av);
          const nb = Number(bv);
          const cmp =
            !Number.isNaN(na) && !Number.isNaN(nb) && av !== "" && bv !== ""
              ? na - nb
              : String(av).localeCompare(String(bv), "id");
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const view = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const exportCsv = () => {
    const header = columns.map((c) => `"${c.header}"`).join(",");
    const body = filtered
      .map((r) => columns.map((c) => `"${String(val(r, c) ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\ufeff${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName ?? "data"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingBlock />;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {(searchable || exportName || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 p-3">
          {searchable && (
            <div className="relative min-w-48 flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Cari..."
                className="h-9 pl-8"
              />
            </div>
          )}
          {toolbar}
          {exportName && (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="size-4" /> Ekspor CSV
            </Button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="p-6">
          <EmptyState title={emptyTitle ?? "Belum ada data"} />
        </div>
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        "px-3 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap",
                        c.align === "right" && "text-right",
                        c.align === "center" && "text-center",
                        c.align !== "right" && c.align !== "center" && "text-left",
                      )}
                    >
                      {c.sortable === false ? (
                        c.header
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-primary"
                          onClick={() =>
                            setSort((s) =>
                              s?.key === c.key
                                ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
                                : { key: c.key, dir: "asc" },
                            )
                          }
                        >
                          {c.header}
                          <ArrowUpDown className="size-3 opacity-50" />
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.map((row, i) => (
                  <tr
                    key={(row.id as string) ?? i}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-b border-border/40 transition-colors last:border-0",
                      onRowClick && "cursor-pointer hover:bg-accent/50",
                    )}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "tabular px-3 py-2.5 whitespace-nowrap",
                          c.align === "right" && "text-right",
                          c.align === "center" && "text-center",
                          c.className,
                        )}
                      >
                        {c.render ? c.render(row) : String(val(row, c) ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-3 py-2 text-xs text-muted-foreground">
            <span>
              Menampilkan {current * pageSize + 1}–
              {Math.min((current + 1) * pageSize, filtered.length)} dari {filtered.length} baris
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                Sebelumnya
              </Button>
              <span className="px-2">
                {current + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={current >= pageCount - 1}
                onClick={() => setPage(current + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
