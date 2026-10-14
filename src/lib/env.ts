import "server-only";
import { z } from "zod";

/** Treats an empty value in .env the same as a missing one. */
function optional<T extends z.ZodType>(field: T) {
  return z.preprocess((value) => (value === "" ? undefined : value), field.optional());
}

const schema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a postgres:// connection string"),
  IP_HASH_SALT: z
    .string({ error: "IP_HASH_SALT is required" })
    .min(32, "IP_HASH_SALT must be at least 32 characters (openssl rand -hex 32)"),

  // Email is optional. Without an API key the app runs normally and logs instead of sending.
  RESEND_API_KEY: optional(z.string()),
  EMAIL_FROM: optional(z.string()),
});

type ServerEnv = z.infer<typeof schema>;

let cached: { source: string; env: ServerEnv } | undefined;

/**
 * Server-side environment, validated on first use rather than at import so a build without
 * secrets still succeeds and a misconfigured deploy fails with a readable message instead
 * of an obscure driver error.
 *
 * Validated again whenever one of the values changes, because `next dev` reloads `.env`
 * without restarting.
 */
export function serverEnv(): ServerEnv {
  const source = Object.keys(schema.shape)
    .map((name) => process.env[name] ?? "")
    .join("\u0000");
  if (cached?.source === source) return cached.env;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  - ${issue.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}\nSee .env.example.`);
  }

  cached = { source, env: parsed.data };
  return cached.env;
}
