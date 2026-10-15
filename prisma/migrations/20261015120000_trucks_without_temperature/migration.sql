-- Trucks no longer have a temperature: any load can go on any truck, and each load shows its
-- own temperature. Apply after the code that stops reading this column is deployed.

-- AlterTable
ALTER TABLE "vehicles" DROP COLUMN "temperature";
