import type { MaterialId } from "@/config/materials";
import type { LoadTypeId, TruckAllocation } from "@/lib/truck-plan";
import type { QuoteFieldErrors } from "./schema";

/** What the customer sees on the confirmation screen. */
export type QuoteConfirmation = {
  reference: string;
  /** "City, State" */
  origin: string;
  destination: string;
  originCity: string;
  destinationCity: string;
  material: MaterialId;
  quantityKg: number;
  loadType: LoadTypeId;
  trucks: TruckAllocation[];
  pickupDate: string | null;
};

export type QuoteFormState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors?: QuoteFieldErrors }
  | { status: "success"; confirmation: QuoteConfirmation };

export const INITIAL_QUOTE_FORM_STATE: QuoteFormState = { status: "idle" };
