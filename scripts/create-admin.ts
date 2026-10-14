/**
 * Creates an admin account, or resets the password of an existing one.
 *
 *   pnpm admin:create --email owner@example.com --name "Owner Name"
 *
 * The password is asked for interactively. For scripted use, pass it in the
 * ADMIN_PASSWORD environment variable instead.
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { withExplicitSslMode } from "../src/lib/connection-string";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../src/lib/password-policy";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Reads a line from the terminal without echoing it. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    // Raw mode first, so nothing typed is echoed even if it arrives before the prompt.
    stdin.setRawMode(true);
    stdout.write(question);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n" || char === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") process.exit(130);
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function readPassword(): Promise<string> {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (!process.stdin.isTTY) fail("No terminal to ask for a password. Set ADMIN_PASSWORD instead.");

  const password = await promptHidden(`Password (at least ${PASSWORD_MIN_LENGTH} characters): `);
  const confirmation = await promptHidden("Repeat password: ");
  if (password !== confirmation) fail("The passwords do not match.");
  return password;
}

async function main() {
  const { values } = parseArgs({
    options: { email: { type: "string" }, name: { type: "string" } },
  });

  const email = values.email?.trim().toLowerCase();
  const name = values.name?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail('Usage: pnpm admin:create --email owner@example.com --name "Owner Name"');
  }

  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) fail("DATABASE_URL is not set. See .env.example.");

  const password = await readPassword();
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    fail(`The password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters long.`);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: withExplicitSslMode(connectionString) }) });
  try {
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (!existing && !name) fail("A new account needs --name.");

    const passwordHash = await hashPassword(password);
    const user = await prisma.adminUser.upsert({
      where: { email },
      create: { email, name: name ?? email, passwordHash },
      update: { passwordHash, ...(name ? { name } : {}) },
    });
    // A password reset signs the account out everywhere.
    if (existing) await prisma.session.deleteMany({ where: { userId: user.id } });

    const url = new URL(connectionString);
    const where = `${url.hostname}${url.pathname}`;
    console.log(
      existing
        ? `Password reset for ${user.email} in database ${where}.`
        : `Admin account created for ${user.email} in database ${where}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
