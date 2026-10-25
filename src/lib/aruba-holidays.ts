/** Common Aruba public holidays (fixed + typical movable approximations for demo). */
export function arubaHolidaysForYear(year: number): { date: string; name: string }[] {
  const y = year;
  const list: { date: string; name: string }[] = [
    { date: `${y}-01-01`, name: "New Year's Day" },
    { date: `${y}-01-25`, name: "GF Betico Croes Day" },
    { date: `${y}-03-18`, name: "National Anthem & Flag Day" },
    { date: `${y}-04-27`, name: "King's Day" },
    { date: `${y}-05-01`, name: "Labour Day" },
    { date: `${y}-12-25`, name: "Christmas Day" },
    { date: `${y}-12-26`, name: "Boxing Day" },
  ];
  // Approximate Carnival Monday (often Feb) — demo placeholder 2nd Monday of Feb
  const feb1 = new Date(y, 1, 1);
  const dow = feb1.getDay();
  const firstMon = dow === 1 ? 1 : ((8 - dow) % 7) + 1;
  const carnivalMon = firstMon + 7;
  list.push({
    date: `${y}-02-${String(carnivalMon).padStart(2, "0")}`,
    name: "Carnival Monday (approx)",
  });
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
