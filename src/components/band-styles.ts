import type { MaterialId } from "@/config/materials";

/** Tailwind classes for each temperature band. Written out in full so the compiler can see them. */
export const BAND_STYLES: Record<
  MaterialId,
  { fill: string; hatch: string; text: string; selected: string; rule: string; soft: string }
> = {
  FROZEN: {
    fill: "bg-frozen",
    hatch: "bg-[repeating-linear-gradient(135deg,var(--color-frozen)_0_5px,transparent_5px_10px)]",
    text: "text-frozen",
    selected: "border-frozen bg-frozen-soft",
    rule: "border-t-frozen",
    soft: "bg-frozen-soft",
  },
  CHILLED: {
    fill: "bg-chilled",
    hatch: "bg-[repeating-linear-gradient(135deg,var(--color-chilled)_0_5px,transparent_5px_10px)]",
    text: "text-chilled",
    selected: "border-chilled bg-chilled-soft",
    rule: "border-t-chilled",
    soft: "bg-chilled-soft",
  },
  AMBIENT: {
    fill: "bg-ambient",
    hatch: "bg-[repeating-linear-gradient(135deg,var(--color-ambient)_0_5px,transparent_5px_10px)]",
    text: "text-ambient",
    selected: "border-ambient bg-ambient-soft",
    rule: "border-t-ambient",
    soft: "bg-ambient-soft",
  },
};
