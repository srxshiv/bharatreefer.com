import "dotenv/config";
import { defineConfig } from "prisma/config";

// Used by the Prisma CLI only (migrate, studio, db ...). The app connects through src/lib/db.ts.
// Migrations need a direct connection; on Neon that is DIRECT_URL (the non-pooled host).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
