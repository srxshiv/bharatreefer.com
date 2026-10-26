-- Every account gets a promo code customers can give with a quote request, and requests record
-- whose code it was. Staff ask for loads to go on trucks; an admin approves or declines.
--
-- Only adds things, but apply it right before deploying the code that uses it: the old code
-- creates accounts without a promo code, which this makes required.

-- CreateEnum
CREATE TYPE "load_request_status" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "quote_activity_type" ADD VALUE 'REFERRER_CHANGE';

-- AlterTable
-- Existing accounts get a code from their first name ("Priya Sharma" becomes PRIYA), or from the
-- email address when the name has too few Latin letters. If that is short or taken, the first
-- three letters and two characters from a hash of the account id. New accounts get theirs from
-- src/features/team/promo-code.ts, which tries a few more combinations of the name first.
ALTER TABLE "admin_users" ADD COLUMN     "promo_code" TEXT;

DO $$
DECLARE
  account RECORD;
  letters TEXT;
  first_word TEXT;
  code TEXT;
  attempt INT;
BEGIN
  FOR account IN SELECT id, name, email FROM "admin_users" ORDER BY created_at LOOP
    letters := upper(regexp_replace(account.name, '[^A-Za-z]', '', 'g'));
    first_word := upper(coalesce(substring(account.name FROM '[A-Za-z]+'), ''));
    IF length(letters) < 3 THEN
      letters := upper(regexp_replace(split_part(account.email, '@', 1), '[^A-Za-z]', '', 'g'));
      first_word := letters;
    END IF;

    code := left(first_word, 5);
    attempt := 0;
    WHILE length(code) < 4 OR EXISTS (SELECT 1 FROM "admin_users" WHERE promo_code = code) LOOP
      attempt := attempt + 1;
      code := left(letters || 'XXX', 3) || substr(translate(upper(md5(account.id || attempt::text)), '01', 'ZY'), 1, 2);
    END LOOP;

    UPDATE "admin_users" SET promo_code = code WHERE id = account.id;
  END LOOP;
END $$;

ALTER TABLE "admin_users" ALTER COLUMN "promo_code" SET NOT NULL;

-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "promo_code" TEXT,
ADD COLUMN     "referrer_id" TEXT;

-- CreateTable
CREATE TABLE "load_requests" (
    "id" TEXT NOT NULL,
    "quote_request_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "load_kg" INTEGER NOT NULL,
    "status" "load_request_status" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" TEXT,
    "decided_by_id" TEXT,
    "decided_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "load_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "load_requests_status_created_at_idx" ON "load_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "load_requests_quote_request_id_idx" ON "load_requests"("quote_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_promo_code_key" ON "admin_users"("promo_code");

-- CreateIndex
CREATE INDEX "quote_requests_referrer_id_created_at_idx" ON "quote_requests"("referrer_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_requests" ADD CONSTRAINT "load_requests_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_requests" ADD CONSTRAINT "load_requests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_requests" ADD CONSTRAINT "load_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_requests" ADD CONSTRAINT "load_requests_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
