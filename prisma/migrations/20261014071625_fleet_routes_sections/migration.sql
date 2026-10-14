-- CreateEnum
CREATE TYPE "vehicle_status" AS ENUM ('AVAILABLE', 'MAINTENANCE');

-- AlterEnum
ALTER TYPE "quote_activity_type" ADD VALUE 'ASSIGNMENT';

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "announcement" JSONB,
ADD COLUMN     "sections" JSONB;

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "capacity_kg" INTEGER NOT NULL,
    "model" TEXT,
    "driver_name" TEXT,
    "driver_phone" TEXT,
    "status" "vehicle_status" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_assignments" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "quote_request_id" TEXT NOT NULL,
    "load_kg" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "truck_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "origin_state" TEXT NOT NULL,
    "origin_city" TEXT NOT NULL,
    "destination_state" TEXT NOT NULL,
    "destination_city" TEXT NOT NULL,
    "transit_time" TEXT,
    "frequency" TEXT,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "vehicles"("plate_number");

-- CreateIndex
CREATE INDEX "vehicles_capacity_kg_idx" ON "vehicles"("capacity_kg");

-- CreateIndex
CREATE INDEX "truck_assignments_quote_request_id_idx" ON "truck_assignments"("quote_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "truck_assignments_vehicle_id_quote_request_id_key" ON "truck_assignments"("vehicle_id", "quote_request_id");

-- CreateIndex
CREATE INDEX "routes_position_idx" ON "routes"("position");

-- AddForeignKey
ALTER TABLE "truck_assignments" ADD CONSTRAINT "truck_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_assignments" ADD CONSTRAINT "truck_assignments_quote_request_id_fkey" FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
