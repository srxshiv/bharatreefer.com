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

// Dates are written out by hand rather than with Intl.DateTimeFormat. Browsers word them
// differently ("15 Oct, 11:34 am" in Node and Chrome, "15 Oct at 11:34 AM" in Safari), and a
// date formatted on the server and again in the browser has to match exactly or React
// reports a mismatch. India keeps UTC+5:30 all year, so its time is simple to work out.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const INDIA_OFFSET_MS = (5 * 60 + 30) * 60_000;

/** The parts of a moment in India time. */
function indiaParts(date: Date) {
  const shifted = new Date(date.getTime() + INDIA_OFFSET_MS);
  const hours = shifted.getUTCHours();
  return {
    day: shifted.getUTCDate(),
    month: MONTHS[shifted.getUTCMonth()],
    year: shifted.getUTCFullYear(),
    time: `${hours % 12 === 0 ? 12 : hours % 12}:${String(shifted.getUTCMinutes()).padStart(2, "0")} ${hours < 12 ? "am" : "pm"}`,
  };
}

/** "2026-10-09" -> "9 Oct 2026" */
export function formatIsoDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** "2026-10-09" -> "9 Oct": a nearby date, where the year goes without saying. */
export function formatIsoDayMonth(value: string): string {
  const [, month, day] = value.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

/** A moment in Indian time: "8 Oct 2026, 3:47 pm". */
export function formatDateTimeInIndia(date: Date): string {
  const { day, month, year, time } = indiaParts(date);
  return `${day} ${month} ${year}, ${time}`;
}

/** A recent moment in Indian time, without the year: "8 Oct, 3:47 pm". */
export function formatShortDateTimeInIndia(date: Date): string {
  const { day, month, time } = indiaParts(date);
  return `${day} ${month}, ${time}`;
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
