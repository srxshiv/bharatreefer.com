"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { requestRouteQuote, type RoutePrefill } from "./route-prefill";

/**
 * Starts a quote for a route. A plain link to the form underneath, so it still scrolls
 * there before the page's scripts have loaded; once they have, it fills the route in too.
 */
export function RouteButton({ route, className }: { route: RoutePrefill; className?: string }) {
  return (
    <a
      href="#quote"
      onClick={(event) => {
        event.preventDefault();
        requestRouteQuote(route);
      }}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg text-sm font-semibold text-ice-700 transition-colors hover:text-navy-950",
        className,
      )}
    >
      Quote this route
      <span className="sr-only">
        , {route.originCity} to {route.destinationCity}
      </span>
      <ArrowRight aria-hidden="true" className="size-4" />
    </a>
  );
}
