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

export const formatTime = (v: string | Date | null | undefined) => {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    // Fallback untuk string time PostgreSQL ("HH:mm:ss") atau ISO parsial.
    const match = String(v).match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hh = match[1].padStart(2, "0");
      const mm = match[2];
      return `${hh}:${mm}`;
    }
    return "-";
  }
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const formatDateTime = (v: string | Date | null | undefined) => {
  if (!v) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(v),
  );
};

export const formatFullDateTime = (v: string | Date | null | undefined) => {
  if (!v) return "-";
  const d = new Date(v);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const dayName = days[d.getDay()];
  const day = String(d.getDate());
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${dayName}, ${day} ${month} ${year}, ${hours}:${minutes}`;
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
