import { MATERIAL_IDS, type MaterialId } from "@/config/materials";
import { isQuoteStatus, type QuoteStatusId } from "./status";

export const INBOX_PAGE_SIZE = 25;

export type InboxFilters = {
  /** "ALL" means every stage except spam. */
  status: QuoteStatusId | "ALL";
  material: MaterialId | "ALL";
  /** Free-text search, trimmed. */
  q: string;
  /** 1-based. */
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Reads the inbox filters from URL search params, ignoring anything unrecognised. */
export function parseInboxFilters(params: RawParams): InboxFilters {
  const status = first(params.status).toUpperCase();
  const material = first(params.material).toUpperCase();
  const page = Number.parseInt(first(params.page), 10);

  return {
    status: isQuoteStatus(status) ? status : "ALL",
    material: (MATERIAL_IDS as readonly string[]).includes(material)
      ? (material as MaterialId)
      : "ALL",
    q: first(params.q).trim().slice(0, 100),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Query string for a set of filters, leaving out anything that is at its default. */
export function inboxQuery(filters: Partial<InboxFilters>): string {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status.toLowerCase());
  if (filters.material && filters.material !== "ALL") {
    params.set("material", filters.material.toLowerCase());
  }
  if (filters.q) params.set("q", filters.q);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));

  const query = params.toString();
  return query ? `?${query}` : "";
}
