/** SSL modes that the pg driver already treats as "verify-full", and warns about. */
const VERIFY_FULL_ALIASES = new Set(["prefer", "require", "verify-ca"]);

/**
 * Spells out the SSL mode the pg driver actually uses. Hosted Postgres URLs such as Neon's
 * say `sslmode=require`, which pg treats as `verify-full` (certificate and host checked)
 * and warns about on every connection. Writing `verify-full` keeps that behaviour and
 * silences the warning. Other URLs are returned unchanged.
 */
export function withExplicitSslMode(connectionString: string): string {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return connectionString;
  }
  const mode = url.searchParams.get("sslmode");
  if (!mode || !VERIFY_FULL_ALIASES.has(mode) || url.searchParams.has("uselibpqcompat")) return connectionString;
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
