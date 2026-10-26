-- Accounts get a role (admin or staff) and can be switched off. Requests record the team member
-- who entered them for a customer. Safe to apply before the code that uses it is deployed:
-- it only adds columns.

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'STAFF');

-- AlterTable
-- Every account that exists today was made with `pnpm admin:create` and keeps full access, so
-- the column is added as ADMIN. Accounts created from now on default to STAFF.
ALTER TABLE "admin_users" ADD COLUMN     "disabled_at" TIMESTAMPTZ(3),
ADD COLUMN     "role" "user_role" NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "admin_users" ALTER COLUMN "role" SET DEFAULT 'STAFF';

-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "created_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
