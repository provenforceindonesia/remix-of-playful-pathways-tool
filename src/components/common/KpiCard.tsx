import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const toneMap = {
  primary: {
    tile: "text-primary-foreground bg-[linear-gradient(140deg,var(--color-primary),color-mix(in_oklab,var(--color-primary)_60%,var(--color-secondary)))]",
    glow: "bg-primary/20",
  },
  success: {
    tile: "text-success-foreground bg-[linear-gradient(140deg,var(--color-success),color-mix(in_oklab,var(--color-success)_60%,var(--color-primary)))]",
    glow: "bg-success/20",
  },
  warning: {
    tile: "text-warning-foreground bg-[linear-gradient(140deg,var(--color-warning),color-mix(in_oklab,var(--color-warning)_60%,var(--color-destructive)))]",
    glow: "bg-warning/20",
  },
  danger: {
    tile: "text-destructive-foreground bg-[linear-gradient(140deg,var(--color-destructive),color-mix(in_oklab,var(--color-destructive)_65%,var(--color-warning)))]",
    glow: "bg-destructive/20",
  },
  info: {
    tile: "text-info-foreground bg-[linear-gradient(140deg,var(--color-info),color-mix(in_oklab,var(--color-info)_60%,var(--color-purple)))]",
    glow: "bg-info/20",
  },
  purple: {
    tile: "text-purple-foreground bg-[linear-gradient(140deg,var(--color-purple),color-mix(in_oklab,var(--color-purple)_60%,var(--color-secondary)))]",
    glow: "bg-purple/20",
  },
} as const;

export function KpiCard({
  label,
  value,
  unit,
  sub,
  icon,
  delta,
  deltaTone,
  tone = "primary",
  className,
  onClick,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  icon?: ReactNode;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  tone?: "primary" | "success" | "warning" | "danger" | "info" | "purple";
  className?: string;
  onClick?: () => void;
}) {
  const t = toneMap[tone];
  const dTone =
    deltaTone ?? (delta?.trim().startsWith("-") ? "down" : delta ? "up" : "neutral");

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group relative gap-0 overflow-hidden rounded-xl p-5",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -bottom-12 size-32 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-90",
          t.glow,
          "opacity-60",
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        {icon ? (
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-lg shadow-[0_8px_20px_-10px_rgba(0,0,0,0.6)] [&_svg]:size-5",
              t.tile,
            )}
          >
            {icon}
          </span>
        ) : (
          <span />
        )}
        {delta ? (
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-semibold tabular",
              dTone === "down"
                ? "bg-destructive/15 text-destructive"
                : dTone === "up"
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>

      <p className="relative mt-4 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="kpi-value relative mt-1 flex items-baseline gap-1.5 text-3xl text-foreground">
        {value}
        {unit ? <span className="text-xs font-medium text-muted-foreground">{unit}</span> : null}
      </p>
      {sub ? <p className="relative mt-2 text-xs text-muted-foreground">{sub}</p> : null}
    </Card>
  );
}
