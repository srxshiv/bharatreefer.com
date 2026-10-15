-- Trucks can be on a trip, and record the temperature they are set up for, their body
-- length and their tyre count. Loads record when their trip ended, so one truck can carry
-- parts of the same request on different trips.

-- AlterEnum
ALTER TYPE "vehicle_status" ADD VALUE 'ON_TRIP';

-- DropIndex
DROP INDEX "truck_assignments_vehicle_id_quote_request_id_key";

-- AlterTable
ALTER TABLE "truck_assignments" ADD COLUMN     "delivered_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "length_ft" DOUBLE PRECISION,
ADD COLUMN     "temperature" "material",
ADD COLUMN     "trip_started_at" TIMESTAMPTZ(3),
ADD COLUMN     "tyres" INTEGER;

-- CreateIndex
CREATE INDEX "truck_assignments_vehicle_id_delivered_at_idx" ON "truck_assignments"("vehicle_id", "delivered_at");
