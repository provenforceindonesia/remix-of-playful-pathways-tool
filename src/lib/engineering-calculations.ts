export type CycleTimeInput = {
  observedOutput: number;
  observedMinutes: number;
  idleMinutes: number;
  performanceRatingPct: number;
  allowancePct: number;
};

/** Durasi antara dua jam "HH:MM" dalam menit (mendukung lintas tengah malam). */
export function calculateDurationMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((v) => !Number.isFinite(v))) return 0;
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  return minutes;
}

export function calculateSetupMinutes(start: string, end: string): number {
  return calculateDurationMinutes(start, end);
}

export function calculateNetObservationMinutes(observedMinutes: number, idleMinutes: number): number {
  return Math.max(0, (observedMinutes || 0) - (idleMinutes || 0));
}

/** Observed cycle time dalam detik per unit. */
export function calculateObservedCycleTime(input: CycleTimeInput): number {
  const net = calculateNetObservationMinutes(input.observedMinutes, input.idleMinutes);
  if (!input.observedOutput || net <= 0) return 0;
  return (net * 60) / input.observedOutput;
}

export function calculateNormalTime(input: CycleTimeInput): number {
  return calculateObservedCycleTime(input) * ((input.performanceRatingPct || 0) / 100);
}

/** Standard cycle time = normal time × (1 + allowance). */
export function calculateStandardCycleTime(input: CycleTimeInput): number {
  return calculateNormalTime(input) * (1 + (input.allowancePct || 0) / 100);
}

/* ============================================================
 * Capacity & Manpower — perhitungan berbasis standar tervalidasi
 * ============================================================ */

export type CapacityStepInput = {
  /** Standard cycle time (detik/pcs) dari Time Study Validated atau routing. */
  standardCycleTimeSec: number;
  /** Standard setup time (menit) dari Time Study Validated atau routing. */
  setupTimeMin: number;
  /** Manpower standard per operasi. */
  manpower: number;
  /** Menit kerja per shift (kotor). */
  shiftMinutes: number;
  /** Planned downtime (menit) per shift. */
  plannedDowntimeMin: number;
  /** Target efisiensi (%) 0-100. */
  efficiencyPct: number;
};

/** Menit produksi bersih per shift setelah setup, planned downtime, dan efisiensi. */
export function calculateAvailableProductionMinutes(input: CapacityStepInput): number {
  const gross = (input.shiftMinutes || 0) - (input.setupTimeMin || 0) - (input.plannedDowntimeMin || 0);
  const eff = (input.efficiencyPct || 0) / 100;
  return Math.max(0, gross * (eff > 0 ? eff : 0));
}

/** Kapasitas (pcs) per shift untuk satu operasi. */
export function calculateCapacityPerShift(input: CapacityStepInput): number {
  const ct = input.standardCycleTimeSec || 0;
  if (ct <= 0) return 0;
  return (calculateAvailableProductionMinutes(input) * 60) / ct;
}

/** Manpower yang dibutuhkan untuk memenuhi target pada satu operasi. */
export function calculateRequiredManpower(input: CapacityStepInput, targetPerShift: number): number {
  const capacity = calculateCapacityPerShift(input);
  const crew = Math.max(1, input.manpower || 1);
  if (capacity <= 0) return 0;
  return crew * Math.max(1, Math.ceil(targetPerShift / capacity));
}

/** Utilisasi (%) operasi terhadap target per shift. */
export function calculateUtilizationPct(input: CapacityStepInput, targetPerShift: number): number {
  const capacity = calculateCapacityPerShift(input);
  if (capacity <= 0) return 0;
  return (targetPerShift / capacity) * 100;
}
