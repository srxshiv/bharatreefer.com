/**
 * Indian registration plates. Stored uppercase without spaces ("DL01LA4521") and shown in
 * the groups printed on the plate ("DL 01 LA 4521"). Bharat-series plates look like
 * "22 BH 1234 AA".
 */
const STATE_SERIES = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/;
const BHARAT_SERIES = /^(\d{2})(BH)(\d{4})([A-Z]{1,2})$/;

/** The plate as stored, or null when it does not look like an Indian registration. */
export function normalisePlate(input: string): string | null {
  const plate = input.toUpperCase().replace(/[\s\-.·]/g, "");
  return STATE_SERIES.test(plate) || BHARAT_SERIES.test(plate) ? plate : null;
}

/** "DL01LA4521" -> "DL 01 LA 4521". Anything unrecognised is returned unchanged. */
export function formatPlate(plate: string): string {
  const match = plate.match(STATE_SERIES) ?? plate.match(BHARAT_SERIES);
  return match ? match.slice(1).filter(Boolean).join(" ") : plate;
}
