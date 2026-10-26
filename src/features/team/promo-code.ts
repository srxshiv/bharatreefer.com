// Kept free of server-only imports: the quote form checks a code's shape in the browser, and
// the scripts that create accounts choose codes too.

/** 4 or 5 uppercase letters or digits. */
export const PROMO_CODE_PATTERN = /^[A-Z0-9]{4,5}$/;

export function isPromoCode(value: string): boolean {
  return PROMO_CODE_PATTERN.test(value);
}

/** What a person typed, as stored: " priya-1 " becomes "PRIYA1". */
export function normalisePromoCode(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

/** The words of a name in plain A to Z: "Rāj Kumār-Singh" becomes ["RAJ", "KUMAR", "SINGH"]. */
function words(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);
}

/** The name's words, or the email address's when the name has too few Latin letters. */
function sourceWords(name: string, email: string): string[] {
  const fromName = words(name);
  return fromName.join("").length >= 3 ? fromName : words(email.split("@")[0] ?? "");
}

/**
 * Codes to offer an account, most natural first, all made from its name: "Priya Sharma" gives
 * PRIYA, PRISH, PRIYS, PSHAR, SHARM. Only valid codes are returned, so a short name gives fewer.
 */
export function promoCodeCandidates(name: string, email: string): string[] {
  const parts = sourceWords(name, email);
  const [first = "", ...rest] = parts;
  const last = rest.at(-1) ?? "";
  const candidates = [
    first.slice(0, 5),
    first.slice(0, 3) + last.slice(0, 2),
    first.slice(0, 4) + last.slice(0, 1),
    first.slice(0, 1) + last.slice(0, 4),
    last.slice(0, 5),
    parts.join("").slice(0, 5),
  ];
  return [...new Set(candidates.filter(isPromoCode))];
}

/** Letters and digits that cannot be mistaken for each other when read out or typed: no I, O, 0 or 1. */
const RANDOM_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** The fallback once every candidate is taken: the name's first three letters and two random characters. */
export function randomPromoCode(name: string, email: string, random: () => number = Math.random): string {
  const stem = `${sourceWords(name, email).join("")}XXX`.slice(0, 3);
  let suffix = "";
  for (let index = 0; index < 2; index += 1) {
    suffix += RANDOM_CHARACTERS[Math.floor(random() * RANDOM_CHARACTERS.length)];
  }
  return stem + suffix;
}

/**
 * The code for a new account: the first candidate nobody has, or else a random one that is free.
 * `inUse` returns which of the given codes already belong to an account.
 */
export async function choosePromoCode(
  name: string,
  email: string,
  inUse: (codes: string[]) => Promise<string[]>,
): Promise<string> {
  const candidates = promoCodeCandidates(name, email);
  const taken = new Set(candidates.length > 0 ? await inUse(candidates) : []);
  const free = candidates.find((code) => !taken.has(code));
  if (free) return free;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomPromoCode(name, email);
    if ((await inUse([code])).length === 0) return code;
  }
  throw new Error("Could not find a free promo code.");
}
