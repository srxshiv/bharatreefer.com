-- CreateEnum
CREATE TYPE "material" AS ENUM ('FROZEN', 'CHILLED', 'AMBIENT');

-- CreateEnum
CREATE TYPE "load_type" AS ENUM ('FULL_LOAD', 'PART_LOAD');

-- CreateEnum
CREATE TYPE "quote_status" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED', 'COMPLETED', 'LOST', 'SPAM');

-- CreateTable
CREATE TABLE "quote_requests" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "quote_status" NOT NULL DEFAULT 'NEW',
    "origin_state" TEXT NOT NULL,
    "origin_city" TEXT NOT NULL,
    "destination_state" TEXT NOT NULL,
    "destination_city" TEXT NOT NULL,
    "material" "material" NOT NULL,
    "quantity_kg" INTEGER NOT NULL,
    "load_type" "load_type" NOT NULL,
    "truck_plan" JSONB NOT NULL,
    "pickup_date" DATE,
    "notes" TEXT,
    "contact_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quote_requests_reference_key" ON "quote_requests"("reference");

-- CreateIndex
CREATE INDEX "quote_requests_status_created_at_idx" ON "quote_requests"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "quote_requests_created_at_idx" ON "quote_requests"("created_at" DESC);

-- CreateIndex
CREATE INDEX "quote_requests_phone_idx" ON "quote_requests"("phone");

-- CreateIndex
CREATE INDEX "quote_requests_ip_hash_created_at_idx" ON "quote_requests"("ip_hash", "created_at");
