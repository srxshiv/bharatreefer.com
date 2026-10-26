import { MATERIAL_IDS, type MaterialId } from "@/config/materials";
import { isRegion } from "@/data/india-locations";
import { isPromoCode } from "@/features/team/promo-code";
import { isIsoDate } from "@/lib/dates";
import type { LoadTypeId } from "@/lib/truck-plan";
import { isQuoteStatus, type QuoteStatusId } from "./status";

/** Rows per page the list offers; the first is the default. */
export const PAGE_SIZES = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const INBOX_PAGE_SIZE: PageSize = PAGE_SIZES[0];

export const SORT_IDS = ["newest", "oldest", "pickup"] as const;
export type SortId = (typeof SORT_IDS)[number];

export const SORT_LABELS: Record<SortId, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  pickup: "Pickup date",
};

export type InboxFilters = {
  /** "ALL" means every stage except spam. */
  status: QuoteStatusId | "ALL";
  material: MaterialId | "ALL";
  loadType: LoadTypeId | "ALL";
  /** Whether a price has been entered. */
  quoted: "ANY" | "YES" | "NO";
  /** Exact state names, or "" for any. */
  originState: string;
  destinationState: string;
  /** Received between these calendar days (India time), "YYYY-MM-DD" or "". */
  from: string;
  to: string;
  /** Pickup date between these calendar days, "YYYY-MM-DD" or "". */
  pickupFrom: string;
  pickupTo: string;
  /** Who brought the customer: a team member's promo code, "NONE" for no code, or "" for anyone. Admins only. */
  referrer: string;
  sort: SortId;
  /** Free-text search, trimmed. */
  q: string;
  /** 1-based. */
  page: number;
  /** Rows per page in the list. */
  size: PageSize;
  /** A paged list, or the pipeline board with a column per open stage. */
  view: "list" | "board";
};

export const DEFAULT_INBOX_FILTERS: InboxFilters = {
  status: "ALL",
  material: "ALL",
  loadType: "ALL",
  quoted: "ANY",
  originState: "",
  destinationState: "",
  from: "",
  to: "",
  pickupFrom: "",
  pickupTo: "",
  referrer: "",
  sort: "newest",
  q: "",
  page: 1,
  size: INBOX_PAGE_SIZE,
  view: "list",
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function isoDateOrEmpty(value: string): string {
  return isIsoDate(value) ? value : "";
}

function regionOrEmpty(value: string): string {
  return isRegion(value) ? value : "";
}

/** Swaps a range whose ends were entered the wrong way round. */
function orderedRange(from: string, to: string): [string, string] {
  return from && to && from > to ? [to, from] : [from, to];
}

/** Reads the inbox filters from URL search params, ignoring anything unrecognised. */
export function parseInboxFilters(params: RawParams): InboxFilters {
  const status = first(params.status).toUpperCase();
  const material = first(params.material).toUpperCase();
  const loadType = first(params.load).toUpperCase();
  const quoted = first(params.quoted).toUpperCase();
  const sort = first(params.sort).toLowerCase();
  const referrer = first(params.by).toUpperCase();
  const page = Number.parseInt(first(params.page), 10);
  const size = Number.parseInt(first(params.size), 10);
  const [from, to] = orderedRange(isoDateOrEmpty(first(params.from)), isoDateOrEmpty(first(params.to)));
  const [pickupFrom, pickupTo] = orderedRange(
    isoDateOrEmpty(first(params.pickup_from)),
    isoDateOrEmpty(first(params.pickup_to)),
  );

  return {
    status: isQuoteStatus(status) ? status : "ALL",
    material: (MATERIAL_IDS as readonly string[]).includes(material)
      ? (material as MaterialId)
      : "ALL",
    loadType: loadType === "FULL_LOAD" || loadType === "PART_LOAD" ? loadType : "ALL",
    quoted: quoted === "YES" || quoted === "NO" ? quoted : "ANY",
    originState: regionOrEmpty(first(params.origin)),
    destinationState: regionOrEmpty(first(params.destination)),
    from,
    to,
    pickupFrom,
    pickupTo,
    referrer: referrer === "NONE" || isPromoCode(referrer) ? referrer : "",
    sort: (SORT_IDS as readonly string[]).includes(sort) ? (sort as SortId) : "newest",
    q: first(params.q).trim().slice(0, 100),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? (size as PageSize) : INBOX_PAGE_SIZE,
    view: first(params.view).toLowerCase() === "board" ? "board" : "list",
  };
}

/** Query string for a set of filters, leaving out anything that is at its default. */
export function inboxQuery(filters: Partial<InboxFilters>): string {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status.toLowerCase());
  if (filters.material && filters.material !== "ALL") {
    params.set("material", filters.material.toLowerCase());
  }
  if (filters.loadType && filters.loadType !== "ALL") params.set("load", filters.loadType.toLowerCase());
  if (filters.quoted && filters.quoted !== "ANY") params.set("quoted", filters.quoted.toLowerCase());
  if (filters.originState) params.set("origin", filters.originState);
  if (filters.destinationState) params.set("destination", filters.destinationState);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.pickupFrom) params.set("pickup_from", filters.pickupFrom);
  if (filters.pickupTo) params.set("pickup_to", filters.pickupTo);
  if (filters.referrer) params.set("by", filters.referrer.toLowerCase());
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.q) params.set("q", filters.q);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.size && filters.size !== INBOX_PAGE_SIZE) params.set("size", String(filters.size));
  if (filters.view === "board") params.set("view", "board");

  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Filters beyond the status tabs and the search box, the ones in the "More filters" panel. */
export const ADVANCED_FILTER_KEYS = [
  "loadType",
  "quoted",
  "originState",
  "destinationState",
  "from",
  "to",
  "pickupFrom",
  "pickupTo",
  "referrer",
  "sort",
] as const satisfies ReadonlyArray<keyof InboxFilters>;

export function hasAdvancedFilters(filters: InboxFilters): boolean {
  return ADVANCED_FILTER_KEYS.some((key) => filters[key] !== DEFAULT_INBOX_FILTERS[key]);
}

/** Anything narrowing the list beyond the status tab. */
export function isFiltered(filters: InboxFilters): boolean {
  return filters.q !== "" || filters.material !== "ALL" || hasAdvancedFilters(filters);
}
