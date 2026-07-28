import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Home, Inbox, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const parts = pathname.split("/").filter(Boolean);

  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="flex items-center gap-1 hover:text-primary">
            <Home className="size-3" /> Beranda
          </Link>
          {parts.map((p, i) => (
            <span key={`${p}-${i}`} className="flex items-center gap-1">
              <ChevronRight className="size-3" />
              <span className="capitalize">{p.replace(/-/g, " ")}</span>
            </span>
          ))}
        </nav>
        <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function LoadingBlock({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function EmptyState({
  title = "Belum ada data",
  description = "Data akan muncul di sini setelah transaksi dibuat.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="items-center gap-2 border-dashed p-10 text-center">
      <Inbox className="size-10 text-muted-foreground/60" />
      <p className="font-semibold text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </Card>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <Card className="items-center gap-2 border-destructive/40 bg-destructive/5 p-10 text-center">
      <AlertCircle className="size-10 text-destructive" />
      <p className="font-semibold text-foreground">Gagal memuat data</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {message ?? "Terjadi kesalahan saat mengambil data dari server."}
      </p>
    </Card>
  );
}
