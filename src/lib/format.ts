export const formatNumber = (v: number | null | undefined, digits = 0) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(v ?? 0));

export const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v ?? 0));

export const formatCompactCurrency = (v: number | null | undefined) => {
  const n = Number(v ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `Rp ${formatNumber(n / 1_000_000_000, 2)} M`;
  if (abs >= 1_000_000) return `Rp ${formatNumber(n / 1_000_000, 1)} Jt`;
  if (abs >= 1_000) return `Rp ${formatNumber(n / 1_000, 0)} rb`;
  return formatCurrency(n);
};

export const formatPercent = (v: number | null | undefined, digits = 1) =>
  `${formatNumber(v, digits)}%`;

export const formatDate = (v: string | Date | null | undefined) => {
  if (!v) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(v));
};

export const formatDateTime = (v: string | Date | null | undefined) => {
  if (!v) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(v),
  );
};

export const formatFullDateTime = (v: string | Date | null | undefined) => {
  if (!v) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(v));
};


export const toISODate = (d: Date) => {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
};

export const durationLabel = (minutes: number | null | undefined) => {
  const m = Math.round(Number(minutes ?? 0));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}j ${m % 60}m` : `${m}m`;
};

/** Klasifikasi Speed Index sesuai standar MANUFACTUREIQ */
export function speedIndexClass(si: number) {
  if (si >= 100) return { label: "Above Standard", tone: "success" as const };
  if (si >= 95) return { label: "Normal", tone: "info" as const };
  if (si >= 85) return { label: "Lambat", tone: "warning" as const };
  return { label: "Kritis", tone: "danger" as const };
}
