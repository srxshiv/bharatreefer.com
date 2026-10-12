import type { MaterialId } from "@/config/materials";
import type { LoadTypeId, TruckAllocation } from "@/lib/truck-plan";
import type { QuoteFieldErrors } from "./schema";

/** What the customer sees on the confirmation screen. */
export type QuoteConfirmation = {
  reference: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  material: MaterialId;
  quantityKg: number;
  loadType: LoadTypeId;
  trucks: TruckAllocation[];
  pickupDate: string | null;
  contactName: string;
  /** E.164 */
  phone: string;
};

export type QuoteFormState =
  | { status: "idle" }
  | { status: "error"; message?: string; fieldErrors?: QuoteFieldErrors }
  | { status: "success"; confirmation: QuoteConfirmation };

export const INITIAL_QUOTE_FORM_STATE: QuoteFormState = { status: "idle" };
