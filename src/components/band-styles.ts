import type { MaterialId } from "@/config/materials";

/** Tailwind classes for each temperature band. Written out in full so the compiler can see them. */
export const BAND_STYLES: Record<
  MaterialId,
  { fill: string; text: string; selected: string; rule: string }
> = {
  FROZEN: {
    fill: "bg-frozen",
    text: "text-frozen",
    selected: "border-frozen bg-frozen-soft",
    rule: "border-t-frozen",
  },
  CHILLED: {
    fill: "bg-chilled",
    text: "text-chilled",
    selected: "border-chilled bg-chilled-soft",
    rule: "border-t-chilled",
  },
  AMBIENT: {
    fill: "bg-ambient",
    text: "text-ambient",
    selected: "border-ambient bg-ambient-soft",
    rule: "border-t-ambient",
  },
};
