/** Temperature bands offered. Ids match the `Material` enum in prisma/schema.prisma and never change. */
export const MATERIAL_IDS = ["FROZEN", "CHILLED", "AMBIENT"] as const;

export type MaterialId = (typeof MATERIAL_IDS)[number];

export function isMaterialId(value: unknown): value is MaterialId {
  return typeof value === "string" && (MATERIAL_IDS as readonly string[]).includes(value);
}

/** How a band is presented. Editable in the admin panel; `DEFAULT_BANDS` are the defaults. */
export type TemperatureBandInfo = {
  id: MaterialId;
  label: string;
  /** Set-point range as shown to customers. */
  range: string;
  summary: string;
  examples: string[];
};

export const DEFAULT_BANDS: Record<MaterialId, TemperatureBandInfo> = {
  FROZEN: {
    id: "FROZEN",
    label: "Frozen",
    range: "−18 to −22 °C",
    summary: "Deep-frozen cargo held at a constant sub-zero set point for the whole run.",
    examples: ["Ice cream", "Frozen foods", "Meat and poultry", "Seafood"],
  },
  CHILLED: {
    id: "CHILLED",
    label: "Chilled",
    range: "0 to 4 °C",
    summary: "Fresh cargo kept just above freezing so it arrives the way it was loaded.",
    examples: ["Dairy", "Fruit and vegetables", "Chocolate and confectionery", "Fresh meat"],
  },
  AMBIENT: {
    id: "AMBIENT",
    label: "Normal",
    range: "Ambient",
    summary: "Dry cargo that needs an insulated, clean body but no active cooling.",
    examples: ["Packaged foods", "Beverages", "FMCG goods", "Dry goods"],
  },
};
