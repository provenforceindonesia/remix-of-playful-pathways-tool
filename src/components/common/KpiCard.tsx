import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = "primary",
  className,
  onClick,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "purple";
  className?: string;
  onClick?: () => void;
}) {
  const toneMap = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    danger: "text-destructive bg-destructive/10",
    info: "text-info bg-info/10",
    purple: "text-purple bg-purple/10",
  } as const;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative gap-0 overflow-hidden rounded-xl border-border/70 p-4 transition-colors",
        onClick && "cursor-pointer hover:border-primary/50",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {icon ? (
          <span className={cn("flex size-8 items-center justify-center rounded-lg", toneMap[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="kpi-value mt-2 text-2xl text-foreground">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </Card>
  );
}
