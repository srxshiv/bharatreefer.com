-- Adds only. Safe for the code running before this release.

-- A request's pickup date can now be set or changed from the panel, and the timeline says so.
ALTER TYPE "quote_activity_type" ADD VALUE 'PICKUP_CHANGE';

-- The customer's company or business, from the quote form.
ALTER TABLE "quote_requests" ADD COLUMN "company_name" TEXT;

-- When the customer was emailed which truck is coming, the day before pickup.
ALTER TABLE "truck_assignments" ADD COLUMN "notice_sent_at" TIMESTAMPTZ(3);

-- Each truck's live location link, which lasts about two weeks, and when it was last set.
ALTER TABLE "vehicles" ADD COLUMN "tracking_url" TEXT,
ADD COLUMN "tracking_url_set_at" TIMESTAMPTZ(3);
