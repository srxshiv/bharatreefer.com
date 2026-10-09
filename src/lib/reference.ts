import "server-only";
import { randomInt } from "node:crypto";

// No 0/O, 1/I/L or U: the code is read out over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const LENGTH = 6;

/** Customer-facing quote reference such as "BR-7K3Q9F". */
export function generateReference(): string {
  let code = "";
  for (let i = 0; i < LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `BR-${code}`;
}
