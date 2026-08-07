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
