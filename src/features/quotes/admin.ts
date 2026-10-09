import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/features/auth/session";
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
  createdAt: true,
} satisfies Prisma.QuoteRequestSelect;

const exportSelect = {
  ...inboxSelect,
  email: true,
  pickupDate: true,
  notes: true,
} satisfies Prisma.QuoteRequestSelect;

const detailSelect = {
  ...exportSelect,
  updatedAt: true,
  activities: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      body: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  },
} satisfies Prisma.QuoteRequestSelect;

export type InboxRow = Prisma.QuoteRequestGetPayload<{ select: typeof inboxSelect }>;
export type ExportRow = Prisma.QuoteRequestGetPayload<{ select: typeof exportSelect }>;
export type QuoteDetail = Prisma.QuoteRequestGetPayload<{ select: typeof detailSelect }>;

export type StatusCounts = Record<QuoteStatusId | "ALL", number>;

/** Search and material filters. The status filter is applied separately so tab counts ignore it. */
function matching(filters: Pick<InboxFilters, "q" | "material">): Prisma.QuoteRequestWhereInput {
  const where: Prisma.QuoteRequestWhereInput = {};
  if (filters.material !== "ALL") where.material = filters.material;

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

export async function listQuoteRequests(filters: InboxFilters): Promise<{
  rows: InboxRow[];
  total: number;
  pageCount: number;
  counts: StatusCounts;
}> {
  await requireAdmin();

  const base = matching(filters);
  const where = { AND: [base, inStatus(filters.status)] };

  const [rows, total, grouped] = await Promise.all([
    db().quoteRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * INBOX_PAGE_SIZE,
      take: INBOX_PAGE_SIZE,
      select: inboxSelect,
    }),
    db().quoteRequest.count({ where }),
    db().quoteRequest.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
  ]);

  const counts = Object.fromEntries([
    ["ALL", 0],
    ...QUOTE_STATUSES.map((status) => [status, 0]),
  ]) as StatusCounts;
  for (const group of grouped) {
    counts[group.status] = group._count._all;
    if (group.status !== "SPAM") counts.ALL += group._count._all;
  }

  return { rows, total, pageCount: Math.max(1, Math.ceil(total / INBOX_PAGE_SIZE)), counts };
}

export async function getQuoteRequest(id: string): Promise<QuoteDetail | null> {
  await requireAdmin();
  return db().quoteRequest.findUnique({ where: { id }, select: detailSelect });
}

/** Rows for the CSV export, newest first, using the same filters as the inbox. */
export async function exportQuoteRequests(filters: InboxFilters): Promise<ExportRow[]> {
  await requireAdmin();
  return db().quoteRequest.findMany({
    where: { AND: [matching(filters), inStatus(filters.status)] },
    orderBy: { createdAt: "desc" },
    take: EXPORT_LIMIT,
    select: exportSelect,
  });
}

function describePriceChange(from: number | null, to: number | null): string {
  if (to === null) return "Quote removed";
  if (from === null) return `Quote set to ${formatInr(to)}`;
  return `Quote changed from ${formatInr(from)} to ${formatInr(to)}`;
}

/** Saves the status and quoted amount, logging each change in the request's timeline. */
export async function updateQuoteRequest(
  id: string,
  update: { status: QuoteStatusId; quotedAmount: number | null },
): Promise<"updated" | "unchanged" | "not-found"> {
  const admin = await requireAdmin();

  return db().$transaction(async (tx) => {
    const current = await tx.quoteRequest.findUnique({
      where: { id },
      select: { status: true, quotedAmount: true },
    });
    if (!current) return "not-found";

    const changes: Array<{ type: "STATUS_CHANGE" | "PRICE_CHANGE"; body: string }> = [];
    if (current.status !== update.status) {
      changes.push({
        type: "STATUS_CHANGE",
        body: `Status changed from ${STATUS_LABELS[current.status]} to ${STATUS_LABELS[update.status]}`,
      });
    }
    if (current.quotedAmount !== update.quotedAmount) {
      changes.push({
        type: "PRICE_CHANGE",
        body: describePriceChange(current.quotedAmount, update.quotedAmount),
      });
    }
    if (changes.length === 0) return "unchanged";

    await tx.quoteRequest.update({
      where: { id },
      data: {
        status: update.status,
        quotedAmount: update.quotedAmount,
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
