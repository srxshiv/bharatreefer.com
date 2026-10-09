/** Temperature bands offered. Ids match the `Material` enum in prisma/schema.prisma. */
export const MATERIAL_IDS = ["FROZEN", "CHILLED", "AMBIENT"] as const;

export type MaterialId = (typeof MATERIAL_IDS)[number];

export type MaterialBand = {
  id: MaterialId;
  label: string;
  /** Set-point range as shown to customers. */
  range: string;
  summary: string;
  examples: string[];
};

export const MATERIALS: Record<MaterialId, MaterialBand> = {
  FROZEN: {
    id: "FROZEN",
    label: "Frozen",
    range: "−18 to −22\u00a0°C",
    summary: "Deep-frozen cargo held at a constant sub-zero set point for the whole run.",
    examples: ["Ice cream", "Frozen foods", "Meat and poultry", "Seafood"],
  },
  CHILLED: {
    id: "CHILLED",
    label: "Chilled",
    range: "0 to 4\u00a0°C",
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

export const MATERIAL_LIST: MaterialBand[] = MATERIAL_IDS.map((id) => MATERIALS[id]);
