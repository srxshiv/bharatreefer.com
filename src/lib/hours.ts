export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type DayName = (typeof DAY_NAMES)[number];

export type OpeningHours = {
  /** Day names the desk is open, e.g. ["Monday", ..., "Saturday"]. */
  days: string[];
  /** "HH:MM", 24-hour, India time. */
  opens: string;
  closes: string;
};

export type DeskStatus = {
  open: boolean;
  /** "Desk open, closes 8:00 PM" or "Desk closed, opens Mon 8:00 AM". */
  label: string;
};

const TIME_ZONE = "Asia/Kolkata";

const SHORT_DAY: Record<DayName, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

export function isDayName(value: unknown): value is DayName {
  return typeof value === "string" && (DAY_NAMES as readonly string[]).includes(value);
}

export function isClockTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function minutesOf(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** "08:00" -> "8:00 AM", "20:30" -> "8:30 PM" */
export function formatClockTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours < 12 ? "AM" : "PM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** Day names in week order, dropping anything unrecognised and duplicates. */
export function normaliseDays(days: string[]): DayName[] {
  return DAY_NAMES.filter((day) => days.includes(day));
}

/** ["Monday".."Saturday"] -> "Mon to Sat"; ["Monday","Wednesday"] -> "Mon, Wed"; all seven -> "Every day". */
export function formatDays(days: string[]): string {
  const ordered = normaliseDays(days);
  if (ordered.length === 0) return "By appointment";
  if (ordered.length === 7) return "Every day";

  const runs: DayName[][] = [];
  for (const day of ordered) {
    const run = runs[runs.length - 1];
    const previous = run?.[run.length - 1];
    if (previous && DAY_NAMES.indexOf(day) === DAY_NAMES.indexOf(previous) + 1) run.push(day);
    else runs.push([day]);
  }

  return runs
    .map((run) =>
      run.length >= 3
        ? `${SHORT_DAY[run[0]]} to ${SHORT_DAY[run[run.length - 1]]}`
        : run.map((day) => SHORT_DAY[day]).join(", "),
    )
    .join(", ");
}

/** "Mon to Sat, 8:00 AM to 8:00 PM" */
export function formatHours(hours: OpeningHours): string {
  return `${formatDays(hours.days)}, ${formatClockTime(hours.opens)} to ${formatClockTime(hours.closes)}`;
}

/** The weekday and clock time in India for a moment. */
function nowInIndia(now: Date): { day: DayName; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const day = read("weekday") as DayName;
  return { day, minutes: Number(read("hour")) * 60 + Number(read("minute")) };
}

/** Whether the desk is open right now (India time) and when that changes. */
export function deskStatus(hours: OpeningHours, now: Date): DeskStatus {
  const days = normaliseDays(hours.days);
  if (days.length === 0 || !isClockTime(hours.opens) || !isClockTime(hours.closes)) {
    return { open: false, label: "Desk closed" };
  }

  const { day, minutes } = nowInIndia(now);
  const opens = minutesOf(hours.opens);
  const closes = minutesOf(hours.closes);
  const todayIndex = DAY_NAMES.indexOf(day);

  if (days.includes(day) && minutes >= opens && minutes < closes) {
    return { open: true, label: `Desk open, closes ${formatClockTime(hours.closes)}` };
  }

  // Find the next opening, starting today if the desk has not opened yet.
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = DAY_NAMES[(todayIndex + offset) % 7];
    if (!days.includes(candidate)) continue;
    if (offset === 0 && minutes >= opens) continue;

    const when =
      offset === 0 ? "" : offset === 1 ? "tomorrow " : `${SHORT_DAY[candidate]} `;
    return { open: false, label: `Desk closed, opens ${when}${formatClockTime(hours.opens)}` };
  }

  // Only open one day a week, and that day has already passed its closing time.
  return { open: false, label: `Desk closed, opens ${SHORT_DAY[days[0]]} ${formatClockTime(hours.opens)}` };
}
