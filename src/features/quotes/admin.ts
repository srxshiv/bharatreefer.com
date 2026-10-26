import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Prisma, QuoteActivityType } from "@/generated/prisma/client";
import type { Role } from "@/features/auth/roles";
import { ADMIN_DATA_TAG, ADMIN_PAGE_CACHE, requireAdmin, requireUser } from "@/features/auth/session";
import { startOfDayInIndia, startOfNextDayInIndia } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatInr } from "@/lib/format";
import type { TruckPlan } from "@/lib/truck-plan";
import { createQuoteRequest } from "./data";
import type { InboxFilters } from "./filters";
import type { QuoteRequestInput } from "./schema";
import { QUOTE_STATUSES, STATUS_LABELS, type QuoteStatusId } from "./status";
import { visibleTo } from "./visibility";

// Every function here checks the session first. Pages, actions and the export route
// all go through this file, so there is no way to reach quote data without signing in.
// Staff only ever reach their own requests (see ./visibility): the rule is part of each query.

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
  createdById: true,
  referrerId: true,
  promoCode: true,
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

/** The team member who entered a request for a customer. Null on requests from the website. */
export type Creator = { name: string; role: Role } | null;
/** The team member whose promo code the request is credited to: they brought the customer. */
export type Referrer = { name: string; promoCode: string } | null;

type WithPeople<T> = Omit<T, "createdById" | "referrerId"> & { createdBy: Creator; referrer: Referrer };

export type InboxRow = WithPeople<Prisma.QuoteRequestGetPayload<{ select: typeof inboxSelect }>>;
export type ExportRow = WithPeople<Prisma.QuoteRequestGetPayload<{ select: typeof exportSelect }>>;
export type QuoteActivityEntry = {
  id: string;
  type: QuoteActivityType;
  body: string;
  createdAt: Date;
  author: { name: string } | null;
};

export type QuoteDetail = WithPeople<Prisma.QuoteRequestGetPayload<{ select: typeof detailSelect }>> & {
  activities: QuoteActivityEntry[];
};

export type StatusCounts = Record<QuoteStatusId | "ALL", number>;
/** Sum of the quoted amounts in each stage, in rupees. */
export type StatusValues = Record<QuoteStatusId, number>;

type TeamDirectory = Map<string, { name: string; role: Role; promoCode: string }>;

/**
 * Every account's name, role and code, read alongside a page's other queries to show who wrote
 * a note, entered a request or brought the customer. One row per team member, so it stays
 * small; switched-off accounts are included because their names stay on what they did.
 */
async function loadTeam(): Promise<TeamDirectory> {
  const members = await db().adminUser.findMany({ select: { id: true, name: true, role: true, promoCode: true } });
  return new Map(members.map(({ id, ...member }) => [id, member]));
}

function withPeople<T extends { createdById: string | null; referrerId: string | null }>(
  { createdById, referrerId, ...row }: T,
  team: TeamDirectory,
): WithPeople<T> {
  const creator = createdById ? team.get(createdById) : undefined;
  const referrer = referrerId ? team.get(referrerId) : undefined;
  return {
    ...row,
    createdBy: creator ? { name: creator.name, role: creator.role } : null,
    referrer: referrer ? { name: referrer.name, promoCode: referrer.promoCode } : null,
  };
}

/** A team member a request can be credited to, for the "Brought by" filter and picker. Admins only. */
export type ReferrerOption = { id: string; name: string; promoCode: string; disabled: boolean };

export async function listReferrers(): Promise<ReferrerOption[]> {
  "use cache: private";
  cacheLife(ADMIN_PAGE_CACHE);
  cacheTag(ADMIN_DATA_TAG);
  const [, members] = await Promise.all([
    requireAdmin(),
    db().adminUser.findMany({
      orderBy: [{ disabledAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
      select: { id: true, name: true, promoCode: true, disabledAt: true },
    }),
  ]);
  return members.map(({ disabledAt, ...member }) => ({ ...member, disabled: disabledAt !== null }));
}

/** Every filter except status, which is applied separately so the tab counts ignore it. */
function matching(filters: Omit<InboxFilters, "status" | "sort" | "page">): Prisma.QuoteRequestWhereInput {
  const where: Prisma.QuoteRequestWhereInput = {};
  if (filters.material !== "ALL") where.material = filters.material;
  if (filters.loadType !== "ALL") where.loadType = filters.loadType;
  if (filters.quoted === "YES") where.quotedAmount = { not: null };
  if (filters.quoted === "NO") where.quotedAmount = null;
  if (filters.originState) where.originState = filters.originState;
  if (filters.destinationState) where.destinationState = filters.destinationState;
  if (filters.referrer === "NONE") where.referrerId = null;
  else if (filters.referrer) where.referrer = { promoCode: filters.referrer };

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
  "use cache: private";
  cacheLife(ADMIN_PAGE_CACHE);
  cacheTag(ADMIN_DATA_TAG);
  // Who is asking decides which requests are in play, so the session check comes first.
  const user = await requireUser();
  const base = { AND: [visibleTo(user), matching(filters)] };
  const where = { AND: [base, inStatus(filters.status)] };

  const [rows, grouped, team] = await Promise.all([
    db().quoteRequest.findMany({
      where,
      orderBy: ordering(filters.sort),
      skip: (filters.page - 1) * filters.size,
      take: filters.size,
      select: inboxSelect,
    }),
    db().quoteRequest.groupBy({
      by: ["status"],
      where: base,
      _count: { _all: true },
      _sum: { quotedAmount: true },
    }),
    loadTeam(),
  ]);

  const { counts, values } = tally(grouped);
  // The per-status counts already hold the total for the current tab.
  const total = counts[filters.status];
  return {
    rows: rows.map((row) => withPeople(row, team)),
    total,
    pageCount: Math.max(1, Math.ceil(total / filters.size)),
    counts,
    values,
  };
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
  "use cache: private";
  cacheLife(ADMIN_PAGE_CACHE);
  cacheTag(ADMIN_DATA_TAG);
  const user = await requireUser();
  const base = { AND: [visibleTo(user), matching(filters)] };
  const [team, placed, grouped, ...columns] = await Promise.all([
    loadTeam(),
    db().truckAssignment.groupBy({
      by: ["quoteRequestId"],
      where: { quoteRequest: { status: "CONFIRMED", ...visibleTo(user) } },
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
    columns: Object.fromEntries(
      BOARD_STAGES.map((stage, index) => [stage, columns[index].map((row) => withPeople(row, team))]),
    ) as Record<BoardStage, InboxRow[]>,
    counts,
    values,
  };
}

export async function getQuoteRequest(id: string): Promise<QuoteDetail | null> {
  "use cache: private";
  cacheLife(ADMIN_PAGE_CACHE);
  cacheTag(ADMIN_DATA_TAG);
  // The request, its timeline and the team's names run together. Nested includes would be
  // fetched one after another instead. A request the team member may not see is not found.
  const user = await requireUser();
  const [quote, activities, team] = await Promise.all([
    db().quoteRequest.findFirst({ where: { id, ...visibleTo(user) }, select: detailSelect }),
    db().quoteActivity.findMany({
      where: { quoteRequestId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, body: true, createdAt: true, authorId: true },
    }),
    loadTeam(),
  ]);
  if (!quote) return null;

  return {
    ...withPeople(quote, team),
    activities: activities.map(({ authorId, ...activity }) => {
      const author = authorId ? team.get(authorId) : undefined;
      return { ...activity, author: author ? { name: author.name } : null };
    }),
  };
}

/**
 * Rows for the CSV export, using the same filters and order as the inbox. With `ids`, just
 * those requests (the rows ticked in the list), whatever the filters.
 */
export async function exportQuoteRequests(filters: InboxFilters, ids?: string[]): Promise<ExportRow[]> {
  const user = await requireUser();
  const [rows, team] = await Promise.all([
    db().quoteRequest.findMany({
      where: {
        AND: [visibleTo(user), ids ? { id: { in: ids } } : { AND: [matching(filters), inStatus(filters.status)] }],
      },
      orderBy: ordering(filters.sort),
      take: EXPORT_LIMIT,
      select: exportSelect,
    }),
    loadTeam(),
  ]);
  return rows.map((row) => withPeople(row, team));
}

/**
 * Enters a request for a customer who called, messaged or walked in. It is stored like one
 * from the website, recorded as created by the signed-in team member and credited to the
 * holder of `referrer`'s promo code (already checked by the caller), if any.
 */
export async function createQuoteRequestForCustomer(
  input: QuoteRequestInput,
  plan: TruckPlan,
  referrer: { id: string; promoCode: string } | null,
): Promise<{ id: string; reference: string; createdBy: { name: string; role: Role } }> {
  const user = await requireUser();
  const created = await createQuoteRequest(input, plan, {
    ipHash: null,
    userAgent: null,
    createdById: user.id,
    referrer,
  });
  return { ...created, createdBy: { name: user.name, role: user.role } };
}

/**
 * Credits a request to another team member, or to nobody: for a customer who forgot the code,
 * or one entered by mistake. Admins only, so staff cannot claim each other's customers.
 */
export async function setQuoteReferrer(
  id: string,
  referrerId: string | null,
): Promise<"updated" | "unchanged" | "not-found" | "no-member"> {
  const admin = await requireAdmin();

  return db().$transaction(async (tx) => {
    const current = await tx.quoteRequest.findUnique({ where: { id }, select: { referrerId: true } });
    if (!current) return "not-found";
    if (current.referrerId === referrerId) return "unchanged";

    const referrer = referrerId
      ? await tx.adminUser.findUnique({ where: { id: referrerId }, select: { name: true, promoCode: true } })
      : null;
    if (referrerId && !referrer) return "no-member";

    await tx.quoteRequest.update({
      where: { id },
      data: {
        referrerId,
        promoCode: referrer?.promoCode ?? null,
        activities: {
          create: {
            authorId: admin.id,
            type: "REFERRER_CHANGE",
            body: referrer ? `Credited to ${referrer.name} (${referrer.promoCode})` : "No longer credited to anyone",
          },
        },
      },
    });
    return "updated";
  });
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
  const admin = await requireUser();

  return db().$transaction(async (tx) => {
    const current = await tx.quoteRequest.findFirst({
      where: { id, ...visibleTo(admin) },
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

    // Loads still on board follow the request: delivered when it is marked Completed, taken
    // off their trucks when it goes back to an earlier stage or is lost.
    if (current.status === "CONFIRMED" && update.status === "COMPLETED") {
      const { count } = await tx.truckAssignment.updateMany({
        where: { quoteRequestId: id, deliveredAt: null },
        data: { deliveredAt: new Date() },
      });
      if (count > 0) {
        changes.push({ type: "ASSIGNMENT", body: count === 1 ? "Delivered; its truck is free" : `Delivered; its ${count} trucks are free` });
      }
    } else if (current.status === "CONFIRMED" && update.status !== "CONFIRMED") {
      const { count } = await tx.truckAssignment.deleteMany({ where: { quoteRequestId: id, deliveredAt: null } });
      if (count > 0) {
        changes.push({ type: "ASSIGNMENT", body: count === 1 ? "Taken off its truck" : `Taken off its ${count} trucks` });
      }
    }
    // Only confirmed requests go on trucks, so asks still waiting for an admin lapse.
    if (current.status === "CONFIRMED" && update.status !== "CONFIRMED") {
      const { count } = await tx.loadRequest.updateMany({
        where: { quoteRequestId: id, status: "PENDING" },
        data: { status: "CANCELLED", decidedAt: new Date() },
      });
      if (count > 0) {
        changes.push({ type: "ASSIGNMENT", body: count === 1 ? "Truck request withdrawn" : `${count} truck requests withdrawn` });
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
  const admin = await requireUser();

  const exists = await db().quoteRequest.findFirst({ where: { id, ...visibleTo(admin) }, select: { id: true } });
  if (!exists) return false;

  await db().quoteActivity.create({
    data: { quoteRequestId: id, authorId: admin.id, type: "NOTE", body },
  });
  return true;
}
