-- Confirmed is folded into Quoted: a quoted request is a booked one, with its price and pickup
-- date agreed, and it is what goes on trucks. Requests at Confirmed move to Quoted first, then
-- the status type is rebuilt without Confirmed.
--
-- Apply this together with the release that stops using Confirmed (see README, Deployment):
-- older code would still offer Confirmed, which the database no longer accepts.

UPDATE "quote_requests" SET "status" = 'QUOTED' WHERE "status" = 'CONFIRMED';

BEGIN;
CREATE TYPE "quote_status_new" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'COMPLETED', 'LOST', 'SPAM');
ALTER TABLE "public"."quote_requests" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "quote_requests" ALTER COLUMN "status" TYPE "quote_status_new" USING ("status"::text::"quote_status_new");
ALTER TYPE "quote_status" RENAME TO "quote_status_old";
ALTER TYPE "quote_status_new" RENAME TO "quote_status";
DROP TYPE "public"."quote_status_old";
ALTER TABLE "quote_requests" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;
