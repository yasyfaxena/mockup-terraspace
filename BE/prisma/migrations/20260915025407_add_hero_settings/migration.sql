-- AlterTable
ALTER TABLE "admin_settings"
  ADD COLUMN "hero_headline" VARCHAR(150) NOT NULL DEFAULT 'TerraSpace · Johor Bahru',
  ADD COLUMN "hero_background_url" VARCHAR(500);
