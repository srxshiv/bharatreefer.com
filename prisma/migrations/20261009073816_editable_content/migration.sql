-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT NOT NULL,
    "alert_email" TEXT,
    "address_street" TEXT NOT NULL,
    "address_city" TEXT NOT NULL,
    "address_region" TEXT NOT NULL,
    "hours_days" JSONB NOT NULL,
    "hours_open" TEXT NOT NULL,
    "hours_close" TEXT NOT NULL,
    "response_time" TEXT NOT NULL,
    "hero_heading" TEXT,
    "hero_intro" TEXT NOT NULL,
    "steps" JSONB,
    "faqs" JSONB,
    "min_quantity_kg" INTEGER NOT NULL,
    "max_quantity_kg" INTEGER NOT NULL,
    "dedicated_fill_percent" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temperature_bands" (
    "id" "material" NOT NULL,
    "label" TEXT NOT NULL,
    "range" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "examples" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "temperature_bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_sizes" (
    "id" TEXT NOT NULL,
    "capacity_kg" INTEGER NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "truck_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_photos" (
    "id" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "truck_sizes_capacity_kg_key" ON "truck_sizes"("capacity_kg");

-- CreateIndex
CREATE INDEX "fleet_photos_position_idx" ON "fleet_photos"("position");
