import type { RouteInfo } from "@/features/content/types";

/** Fired by a route card; the quote card fills in the route and comes into view. */
export const ROUTE_EVENT = "bharat:quote-route";

export type RoutePrefill = Pick<RouteInfo, "originState" | "originCity" | "destinationState" | "destinationCity">;

export function requestRouteQuote(route: RoutePrefill) {
  window.dispatchEvent(new CustomEvent<RoutePrefill>(ROUTE_EVENT, { detail: route }));
}
