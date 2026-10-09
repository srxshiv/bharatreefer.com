/**
 * Normalises an Indian mobile number to E.164 ("+919871094268").
 * Accepts spaces, dashes, brackets and an optional +91, 91 or 0 prefix.
 * Returns null when the input is not a valid 10-digit mobile number.
 */
export function normaliseIndianMobile(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "");

  if (digits.startsWith("+91")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

/** "+919871094268" -> "98710 94268" */
export function formatIndianMobile(e164: string): string {
  const digits = e164.replace(/^\+91/, "");
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}
