import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// scrypt cost parameters, per the OWASP password storage guidance. They are written
// into every hash, so they can be raised later without breaking existing passwords.
const COST = 2 ** 15;
const BLOCK_SIZE = 8;
const PARALLELISM = 3;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function derive(
  password: string,
  salt: Buffer,
  cost: number,
  blockSize: number,
  parallelism: number,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      keyLength,
      { N: cost, r: blockSize, p: parallelism, maxmem: 256 * cost * blockSize },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

/** Returns "scrypt$N$r$p$salt$key", safe to store. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, COST, BLOCK_SIZE, PARALLELISM, KEY_LENGTH);
  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, cost, blockSize, parallelism, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;

  const expected = Buffer.from(key, "base64url");
  const actual = await derive(
    password,
    Buffer.from(salt, "base64url"),
    Number(cost),
    Number(blockSize),
    Number(parallelism),
    expected.length,
  );
  return timingSafeEqual(actual, expected);
}
