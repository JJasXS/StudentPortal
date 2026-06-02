export function formatStaffHourlyRate(rate?: number): string {
  const value = rate ?? 0;
  return `RM ${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

export function parseStaffHourlyRateInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}
