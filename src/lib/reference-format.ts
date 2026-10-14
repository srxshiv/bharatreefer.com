// No 0/O, 1/I/L or U: the code is read out over the phone.
export const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const LENGTH = 6;

/** Builds a reference such as "BR-7K3Q9F" from a source of random indexes (0 to max - 1). */
export function makeReference(randomIndex: (max: number) => number): string {
  let code = "";
  for (let i = 0; i < LENGTH; i += 1) code += REFERENCE_ALPHABET[randomIndex(REFERENCE_ALPHABET.length)];
  return `BR-${code}`;
}
