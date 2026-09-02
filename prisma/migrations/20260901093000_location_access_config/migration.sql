ALTER TABLE "locations"
    ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;

ALTER TABLE "locations"
    ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

ALTER TABLE "locations"
    ADD COLUMN IF NOT EXISTS "access_radius_meters" INTEGER;

ALTER TABLE "locations"
    ALTER COLUMN "access_radius_meters" SET DEFAULT 50;

UPDATE "locations"
SET "access_radius_meters" = 50
WHERE "access_radius_meters" IS NULL;

UPDATE "locations"
SET
    "latitude" = 1.4655,
    "longitude" = 103.7578
WHERE "slug" = 'sattabi-johor-bahru'
  AND ("latitude" IS NULL OR "longitude" IS NULL);