const indiaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

/** Calendar date in India as "YYYY-MM-DD", optionally a number of days from today. */
export function dateInIndia(offsetDays = 0): string {
  return indiaDate.format(new Date(Date.now() + offsetDays * 86_400_000));
}

/** True when the string is a real calendar date in "YYYY-MM-DD" form. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

/** "2026-10-09" -> "9 Oct 2026" */
export function formatIsoDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

const indiaDateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

/** A moment in Indian time: "8 Oct 2026, 3:47 pm". */
export function formatDateTimeInIndia(date: Date): string {
  return indiaDateTime.format(date);
}

/** A stored calendar date (midnight UTC) as "YYYY-MM-DD". */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const INDIA_OFFSET = "+05:30";

/** The moment a calendar day begins in India, for comparing with stored timestamps. */
export function startOfDayInIndia(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00${INDIA_OFFSET}`);
}

/** The moment the day after a calendar day begins in India (an exclusive upper bound). */
export function startOfNextDayInIndia(isoDate: string): Date {
  return new Date(startOfDayInIndia(isoDate).getTime() + 86_400_000);
}
