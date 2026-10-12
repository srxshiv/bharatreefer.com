import type { NextRequest } from "next/server";
import { getSiteContent } from "@/features/content/data";
import { exportQuoteRequests } from "@/features/quotes/admin";
import { parseInboxFilters } from "@/features/quotes/filters";
import { STATUS_LABELS } from "@/features/quotes/status";
import { toCsv } from "@/lib/csv";
import { dateInIndia, formatDateTimeInIndia, toIsoDate } from "@/lib/dates";
import { LOAD_TYPE_LABELS, formatTrucks } from "@/lib/format";
import { formatIndianMobile } from "@/lib/phone";
import { parseTruckPlan } from "@/lib/truck-plan";

const HEADER = [
  "Reference",
  "Received",
  "Status",
  "Customer",
  "Phone",
  "Email",
  "From city",
  "From state",
  "To city",
  "To state",
  "Temperature",
  "Weight (kg)",
  "Load type",
  "Vehicles",
  "Pickup date",
  "Quoted (INR)",
  "Customer notes",
];

/** Downloads the quote requests matching the inbox filters as a CSV file. */
export async function GET(request: NextRequest) {
  const filters = parseInboxFilters(Object.fromEntries(request.nextUrl.searchParams));
  // Checks the session itself and redirects to sign-in when there is none.
  const quotes = await exportQuoteRequests(filters);
  const { bands } = await getSiteContent();

  const rows = quotes.map((quote) => [
    quote.reference,
    formatDateTimeInIndia(quote.createdAt),
    STATUS_LABELS[quote.status],
    quote.contactName,
    formatIndianMobile(quote.phone),
    quote.email,
    quote.originCity,
    quote.originState,
    quote.destinationCity,
    quote.destinationState,
    bands[quote.material].label,
    quote.quantityKg,
    LOAD_TYPE_LABELS[quote.loadType],
    formatTrucks(parseTruckPlan(quote.truckPlan)),
    quote.pickupDate ? toIsoDate(quote.pickupDate) : "",
    quote.quotedAmount,
    quote.notes,
  ]);

  return new Response(toCsv([HEADER, ...rows]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quote-requests-${dateInIndia()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
