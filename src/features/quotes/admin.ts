import "server-only";
import type { Prisma, QuoteActivityType } from "@/generated/prisma/client";
import { requireAdmin } from "@/features/auth/session";
import { startOfDayInIndia, startOfNextDayInIndia } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatInr } from "@/lib/format";
import { INBOX_PAGE_SIZE, type InboxFilters } from "./filters";
import { QUOTE_STATUSES, STATUS_LABELS, type QuoteStatusId } from "./status";

// Every function here checks the session first. Pages, actions and the export route
// all go through this file, so there is no way to reach quote data without signing in.

/** Most rows a single CSV export will return. */
const EXPORT_LIMIT = 5000;

const inboxSelect = {
  id: true,
  reference: true,
  status: true,
  originCity: true,
  originState: true,
  destinationCity: true,
  destinationState: true,
  material: true,
  quantityKg: true,
  loadType: true,
  truckPlan: true,
  contactName: true,
  phone: true,
  quotedAmount: true,
  pickupDate: true,
  createdAt: true,
} satisfies Prisma.QuoteRequestSelect;

const exportSelect = {
  ...inboxSelect,
  email: true,
  notes: true,
} satisfies Prisma.QuoteRequestSelect;

const detailSelect = {
  ...exportSelect,
  updatedAt: true,
} satisfies Prisma.QuoteRequestSelect;

export type InboxRow = Prisma.QuoteRequestGetPayload<{ select: typeof inboxSelect }>;
export type ExportRow = Prisma.QuoteRequestGetPayload<{ select: typeof exportSelect }>;
export type QuoteActivityEntry = {
  id: string;
  type: QuoteActivityType;
  body: string;
  createdAt: Date;
  author: { name: string } | null;
};

export type QuoteDetail = Prisma.QuoteRequestGetPayload<{ select: typeof detailSelect }> & {
  activities: QuoteActivityEntry[];
};

export type StatusCounts = Record<QuoteStatusId | "ALL", number>;
/** Sum of the quoted amounts in each stage, in rupees. */
export type StatusValues = Record<QuoteStatusId, number>;

/** Every filter except status, which is applied separately so the tab counts ignore it. */
function matching(filters: Omit<InboxFilters, "status" | "sort" | "page">): Prisma.QuoteRequestWhereInput {
  const where: Prisma.QuoteRequestWhereInput = {};
  if (filters.material !== "ALL") where.material = filters.material;
  if (filters.loadType !== "ALL") where.loadType = filters.loadType;
  if (filters.quoted === "YES") where.quotedAmount = { not: null };
  if (filters.quoted === "NO") where.quotedAmount = null;
  if (filters.originState) where.originState = filters.originState;
  if (filters.destinationState) where.destinationState = filters.destinationState;

  // Received on calendar days in India time.
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: startOfDayInIndia(filters.from) } : {}),
      ...(filters.to ? { lt: startOfNextDayInIndia(filters.to) } : {}),
    };
  }
  // Pickup dates are stored as plain dates (midnight UTC).
  if (filters.pickupFrom || filters.pickupTo) {
    where.pickupDate = {
      ...(filters.pickupFrom ? { gte: new Date(`${filters.pickupFrom}T00:00:00Z`) } : {}),
      ...(filters.pickupTo ? { lte: new Date(`${filters.pickupTo}T00:00:00Z`) } : {}),
    };
  }

  if (filters.q) {
    const contains = { contains: filters.q, mode: "insensitive" } as const;
    const digits = filters.q.replace(/\D/g, "");
    where.OR = [
      { reference: contains },
      { contactName: contains },
      { email: contains },
      { originCity: contains },
      { originState: contains },
      { destinationCity: contains },
      { destinationState: contains },
      // Phone numbers are stored without spaces, so match on the digits alone.
      ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
    ];
  }
  return where;
}

function inStatus(status: InboxFilters["status"]): Prisma.QuoteRequestWhereInput {
  return status === "ALL" ? { status: { not: "SPAM" } } : { status };
}

function ordering(sort: InboxFilters["sort"]): Prisma.QuoteRequestOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }];
    case "pickup":
      return [{ pickupDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export async function listQuoteRequests(filters: InboxFilters): Promise<{
  rows: InboxRow[];
  total: number;
  pageCount: number;
  counts: StatusCounts;
  values: StatusValues;
}> {
  const base = matching(filters);
  const where = { AND: [base, inStatus(filters.status)] };

  // The session check runs alongside the queries rather than before them, saving a round
  // trip. If it fails it throws a redirect and the rows never leave the server.
  const [, rows, grouped] = await Promise.all([
    requireAdmin(),
    db().quoteRequest.findMany({
      where,
      orderBy: ordering(filters.sort),
      skip: (filters.page - 1) * INBOX_PAGE_SIZE,
      take: INBOX_PAGE_SIZE,
      select: inboxSelect,
    }),
    db().quoteRequest.groupBy({
      by: ["status"],
      where: base,
      _count: { _all: true },
      _sum: { quotedAmount: true },
    }),
  ]);

  const { counts, values } = tally(grouped);
  // The per-status counts already hold the total for the current tab.
  const total = counts[filters.status];
  return { rows, total, pageCount: Math.max(1, Math.ceil(total / INBOX_PAGE_SIZE)), counts, values };
}

function tally(
  grouped: Array<{ status: QuoteStatusId; _count: { _all: number }; _sum: { quotedAmount: number | null } }>,
): { counts: StatusCounts; values: StatusValues } {
  const counts = Object.fromEntries([["ALL", 0], ...QUOTE_STATUSES.map((status) => [status, 0])]) as StatusCounts;
  const values = Object.fromEntries(QUOTE_STATUSES.map((status) => [status, 0])) as StatusValues;
  for (const group of grouped) {
    counts[group.status] = group._count._all;
    values[group.status] = group._sum.quotedAmount ?? 0;
    if (group.status !== "SPAM") counts.ALL += group._count._all;
  }
  return { counts, values };
}

/** Requests on the pipeline board: the newest in each open stage. */
export const BOARD_STAGES = ["NEW", "CONTACTED", "QUOTED", "CONFIRMED"] as const satisfies readonly QuoteStatusId[];
export type BoardStage = (typeof BOARD_STAGES)[number];
/** Most cards loaded per column. The column links to the full list beyond that. */
export const BOARD_COLUMN_LIMIT = 30;

export async function listBoard(filters: InboxFilters): Promise<{
  columns: Record<BoardStage, InboxRow[]>;
  counts: StatusCounts;
  values: StatusValues;
  /** Kilograms already on trucks, for each confirmed request that has any. */
  placedKg: Record<string, number>;
  /** When the board was read, for showing how long ago each request arrived. */
  readAt: number;
}> {
  const base = matching(filters);
  const [, placed, grouped, ...columns] = await Promise.all([
    requireAdmin(),
    db().truckAssignment.groupBy({
      by: ["quoteRequestId"],
      where: { quoteRequest: { status: "CONFIRMED" } },
      _sum: { loadKg: true },
    }),
    db().quoteRequest.groupBy({
      by: ["status"],
      where: base,
      _count: { _all: true },
      _sum: { quotedAmount: true },
    }),
    ...BOARD_STAGES.map((status) =>
      db().quoteRequest.findMany({
        where: { AND: [base, { status }] },
        orderBy: ordering(filters.sort),
        take: BOARD_COLUMN_LIMIT,
        select: inboxSelect,
      }),
    ),
  ]);

  const { counts, values } = tally(grouped);
  return {
    readAt: Date.now(),
    placedKg: Object.fromEntries(placed.map((row) => [row.quoteRequestId, row._sum.loadKg ?? 0])),
    columns: Object.fromEntries(BOARD_STAGES.map((stage, index) => [stage, columns[index]])) as Record<BoardStage, InboxRow[]>,
    counts,
    values,
  };
}

export async function getQuoteRequest(id: string): Promise<QuoteDetail | null> {
  // One round trip: the session check, the request, its timeline and the author names run
  // together. Nested includes would be fetched one after another instead.
  const [, quote, activities, admins] = await Promise.all([
    requireAdmin(),
    db().quoteRequest.findUnique({ where: { id }, select: detailSelect }),
    db().quoteActivity.findMany({
      where: { quoteRequestId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, body: true, createdAt: true, authorId: true },
    }),
    db().adminUser.findMany({ select: { id: true, name: true } }),
  ]);
  if (!quote) return null;

  const names = new Map(admins.map((admin) => [admin.id, admin.name]));
  return {
    ...quote,
    activities: activities.map(({ authorId, ...activity }) => {
      const name = authorId ? names.get(authorId) : undefined;
      return { ...activity, author: name ? { name } : null };
    }),
  };
}

/** Rows for the CSV export, newest first, using the same filters as the inbox. */
export async function exportQuoteRequests(filters: InboxFilters): Promise<ExportRow[]> {
  const [, rows] = await Promise.all([
    requireAdmin(),
    db().quoteRequest.findMany({
      where: { AND: [matching(filters), inStatus(filters.status)] },
      orderBy: ordering(filters.sort),
      take: EXPORT_LIMIT,
      select: exportSelect,
    }),
  ]);
  return rows;
}

function describePriceChange(from: number | null, to: number | null): string {
  if (to === null) return "Quote removed";
  if (from === null) return `Quote set to ${formatInr(to)}`;
  return `Quote changed from ${formatInr(from)} to ${formatInr(to)}`;
}

/**
 * Saves the status and quoted amount, logging each change in the request's timeline.
 * Leave `quotedAmount` out to keep the current price. A confirmed request that goes back to
 * an earlier stage, or is lost, is taken off its trucks; a completed one keeps them as a record.
 */
export async function updateQuoteRequest(
  id: string,
  update: { status: QuoteStatusId; quotedAmount?: number | null },
): Promise<"updated" | "unchanged" | "not-found"> {
  const admin = await requireAdmin();

  return db().$transaction(async (tx) => {
    const current = await tx.quoteRequest.findUnique({
      where: { id },
      select: { status: true, quotedAmount: true },
    });
    if (!current) return "not-found";
    const quotedAmount = update.quotedAmount === undefined ? current.quotedAmount : update.quotedAmount;

    const changes: Array<{ type: QuoteActivityType; body: string }> = [];
    if (current.status !== update.status) {
      changes.push({
        type: "STATUS_CHANGE",
        body: `Status changed from ${STATUS_LABELS[current.status]} to ${STATUS_LABELS[update.status]}`,
      });
    }
    if (current.quotedAmount !== quotedAmount) {
      changes.push({
        type: "PRICE_CHANGE",
        body: describePriceChange(current.quotedAmount, quotedAmount),
      });
    }
    if (changes.length === 0) return "unchanged";

    if (current.status === "CONFIRMED" && update.status !== "CONFIRMED" && update.status !== "COMPLETED") {
      const { count } = await tx.truckAssignment.deleteMany({ where: { quoteRequestId: id } });
      if (count > 0) {
        changes.push({ type: "ASSIGNMENT", body: count === 1 ? "Taken off its truck" : `Taken off its ${count} trucks` });
      }
    }

    await tx.quoteRequest.update({
      where: { id },
      data: {
        status: update.status,
        quotedAmount,
        activities: { create: changes.map((change) => ({ ...change, authorId: admin.id })) },
      },
    });
    return "updated";
  });
}

/** Adds an internal note. Returns false when the request does not exist. */
export async function addQuoteNote(id: string, body: string): Promise<boolean> {
  const admin = await requireAdmin();

  const exists = await db().quoteRequest.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return false;

  await db().quoteActivity.create({
    data: { quoteRequestId: id, authorId: admin.id, type: "NOTE", body },
  });
  return true;
}
