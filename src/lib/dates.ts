/** Date helpers pinned to Aruba time (AST, UTC-4, no DST) so "today" never flips at 8 PM local. */
export const POS_TZ = "America/Aruba";

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: POS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD in Aruba time for a Date or ISO string (defaults to now). */
export function arubaDate(d: Date | string = new Date()): string {
  return fmt.format(typeof d === "string" ? new Date(d) : d);
}

export const arubaToday = () => arubaDate();

/** YYYY-MM-DD for `base` plus `days`, calendar-safe (no timezone drift). */
export function addDays(base: string, days: number): string {
  const [y, m, d] = base.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
