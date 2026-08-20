import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-info/15 text-info border-info/30",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  primary: "bg-primary/15 text-primary border-primary/30",
  purple: "bg-purple/15 text-purple border-purple/30",
} as const;

export type Tone = keyof typeof TONES;

const STATUS_TONE: Record<string, Tone> = {
  // Sales order
  Draft: "neutral",
  "Menunggu Review Produksi": "warning",
  "Perlu Revisi": "danger",
  Dikonfirmasi: "info",
  Direncanakan: "info",
  "Dalam Produksi": "primary",
  "Sebagian Terpenuhi": "warning",
  Selesai: "success",
  Terlambat: "danger",
  Dibatalkan: "neutral",
  "Menunggu Persetujuan Pembatalan": "warning",
  // Plan / WO
  Review: "warning",
  Released: "info",
  "Partially Scheduled": "warning",
  "Fully Scheduled": "info",
  Completed: "success",
  Cancelled: "neutral",
  Scheduled: "info",
  "In Progress": "primary",
  Paused: "warning",
  "Waiting Material": "warning",
  "Waiting Maintenance": "danger",
  Closed: "neutral",
  // Production entry
  "Menunggu Validasi Production Control": "warning",
  "Perlu Perbaikan": "danger",
  Tervalidasi: "success",
  // Downtime
  Dilaporkan: "warning",
  "Dalam Pemeriksaan": "info",
  Ditangani: "primary",
  Berulang: "danger",
  "Membutuhkan Perawatan": "danger",
  // Machine
  Active: "success",
  Inactive: "neutral",
  "Under Maintenance": "warning",
  Breakdown: "danger",
  Retired: "neutral",
  Beroperasi: "success",
  "Dalam Pemantauan": "info",
  "Perlu Perawatan": "warning",
  "Prioritas Perawatan": "danger",
  "Above Standard": "success",
  Normal: "info",
  Lambat: "warning",
  Kritis: "danger",
  // Backlog
  Open: "warning",
  "Partially Recovered": "info",
  Recovered: "success",
  // Generic
  Aktif: "success",
  Nonaktif: "danger",
  Approved: "success",
  Submitted: "info",
  Rejected: "danger",
  Validated: "success",
  Obsolete: "neutral",
  Reserved: "info",
  Issued: "primary",
  Released_: "info",
  "On Schedule": "success",
  "At Risk": "warning",
  Late: "danger",
  Delivered: "success",
  Siap: "success",
  Sebagian: "warning",
  "Tidak Siap": "danger",
  "Belum Dicek": "neutral",
  Urgent: "danger",
  Tinggi: "warning",
  Rendah: "neutral",
  Reguler: "info",
  Recovery: "purple",
  Rework: "warning",
  Trial: "neutral",
};

export function StatusBadge({ status, tone, className }: { status: string; tone?: Tone; className?: string }) {
  const t = tone ?? STATUS_TONE[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
        TONES[t],
        className,
      )}
    >
      {status}
    </span>
  );
}
