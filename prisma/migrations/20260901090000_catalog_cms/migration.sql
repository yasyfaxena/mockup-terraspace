-- Catalog managed by Admin and consumed by the public Web Client.
-- Safe for databases where catalog tables already exist.


-- ============================================================
-- LOCATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS "locations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "image_url" TEXT,
    "hours" TEXT NOT NULL DEFAULT 'Mon–Sun 09:00–22:00',
    "access_247" BOOLEAN NOT NULL DEFAULT false,
    "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);


-- Add missing columns if locations already existed.

ALTER TABLE "locations"
    ADD COLUMN IF NOT EXISTS "slug" TEXT,
    ADD COLUMN IF NOT EXISTS "name" TEXT,
    ADD COLUMN IF NOT EXISTS "address" TEXT,
    ADD COLUMN IF NOT EXISTS "city" TEXT,
    ADD COLUMN IF NOT EXISTS "image_url" TEXT,
    ADD COLUMN IF NOT EXISTS "hours" TEXT,
    ADD COLUMN IF NOT EXISTS "access_247" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "amenities" TEXT[],
    ADD COLUMN IF NOT EXISTS "description" TEXT,
    ADD COLUMN IF NOT EXISTS "status" TEXT,
    ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);


-- Set defaults for catalog columns.

ALTER TABLE "locations"
    ALTER COLUMN "hours"
        SET DEFAULT 'Mon–Sun 09:00–22:00',
    ALTER COLUMN "access_247"
        SET DEFAULT false,
    ALTER COLUMN "amenities"
        SET DEFAULT ARRAY[]::TEXT[],
    ALTER COLUMN "description"
        SET DEFAULT '',
    ALTER COLUMN "status"
        SET DEFAULT 'active',
    ALTER COLUMN "created_at"
        SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "updated_at"
        SET DEFAULT CURRENT_TIMESTAMP;


-- Existing rows may contain NULL values in newly-added columns.
-- Fill them before applying NOT NULL constraints.

UPDATE "locations"
SET "hours" = 'Mon–Sun 09:00–22:00'
WHERE "hours" IS NULL;

UPDATE "locations"
SET "access_247" = false
WHERE "access_247" IS NULL;

UPDATE "locations"
SET "amenities" = ARRAY[]::TEXT[]
WHERE "amenities" IS NULL;

UPDATE "locations"
SET "description" = ''
WHERE "description" IS NULL;

UPDATE "locations"
SET "status" = 'active'
WHERE "status" IS NULL;

UPDATE "locations"
SET "created_at" = CURRENT_TIMESTAMP
WHERE "created_at" IS NULL;

UPDATE "locations"
SET "updated_at" = CURRENT_TIMESTAMP
WHERE "updated_at" IS NULL;


CREATE UNIQUE INDEX IF NOT EXISTS "locations_slug_key"
    ON "locations"("slug");


-- ============================================================
-- WORKSPACES
-- ============================================================

CREATE TABLE IF NOT EXISTS "workspaces" (
    "id" TEXT NOT NULL,
    "slug_id" TEXT NOT NULL,
    "location_slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "floor" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "price" BIGINT NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'hour',
    "amenities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "availability" TEXT NOT NULL DEFAULT 'available',
    "slots" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "image_url" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "cancellation" TEXT NOT NULL DEFAULT '',
    "hide_capacity" BOOLEAN NOT NULL DEFAULT false,
    "simple_booking" BOOLEAN NOT NULL DEFAULT false,
    "calendar_sync" TEXT,
    "qr_provider" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);


-- Add missing columns if workspaces already existed.

ALTER TABLE "workspaces"
    ADD COLUMN IF NOT EXISTS "slug_id" TEXT,
    ADD COLUMN IF NOT EXISTS "location_slug" TEXT,
    ADD COLUMN IF NOT EXISTS "name" TEXT,
    ADD COLUMN IF NOT EXISTS "type" TEXT,
    ADD COLUMN IF NOT EXISTS "floor" TEXT,
    ADD COLUMN IF NOT EXISTS "capacity" INTEGER,
    ADD COLUMN IF NOT EXISTS "price" BIGINT,
    ADD COLUMN IF NOT EXISTS "unit" TEXT,
    ADD COLUMN IF NOT EXISTS "amenities" TEXT[],
    ADD COLUMN IF NOT EXISTS "availability" TEXT,
    ADD COLUMN IF NOT EXISTS "slots" TEXT[],
    ADD COLUMN IF NOT EXISTS "image_url" TEXT,
    ADD COLUMN IF NOT EXISTS "description" TEXT,
    ADD COLUMN IF NOT EXISTS "cancellation" TEXT,
    ADD COLUMN IF NOT EXISTS "hide_capacity" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "simple_booking" BOOLEAN,
    ADD COLUMN IF NOT EXISTS "calendar_sync" TEXT,
    ADD COLUMN IF NOT EXISTS "qr_provider" TEXT,
    ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);


-- Set defaults.

ALTER TABLE "workspaces"
    ALTER COLUMN "slug_id"
        SET DEFAULT '',
    ALTER COLUMN "floor"
        SET DEFAULT '',
    ALTER COLUMN "capacity"
        SET DEFAULT 1,
    ALTER COLUMN "price"
        SET DEFAULT 0,
    ALTER COLUMN "unit"
        SET DEFAULT 'hour',
    ALTER COLUMN "amenities"
        SET DEFAULT ARRAY[]::TEXT[],
    ALTER COLUMN "availability"
        SET DEFAULT 'available',
    ALTER COLUMN "slots"
        SET DEFAULT ARRAY[]::TEXT[],
    ALTER COLUMN "description"
        SET DEFAULT '',
    ALTER COLUMN "cancellation"
        SET DEFAULT '',
    ALTER COLUMN "hide_capacity"
        SET DEFAULT false,
    ALTER COLUMN "simple_booking"
        SET DEFAULT true,
    ALTER COLUMN "created_at"
        SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "updated_at"
        SET DEFAULT CURRENT_TIMESTAMP;


-- Existing rows may contain NULL values in newly-added columns.
-- Fill them before continuing.

UPDATE "workspaces"
SET "slug_id" = "id"
WHERE "slug_id" IS NULL
   OR "slug_id" = '';

UPDATE "workspaces"
SET "floor" = ''
WHERE "floor" IS NULL;

UPDATE "workspaces"
SET "capacity" = 1
WHERE "capacity" IS NULL;

UPDATE "workspaces"
SET "price" = 0
WHERE "price" IS NULL;

UPDATE "workspaces"
SET "unit" = 'hour'
WHERE "unit" IS NULL;

UPDATE "workspaces"
SET "amenities" = ARRAY[]::TEXT[]
WHERE "amenities" IS NULL;

UPDATE "workspaces"
SET "availability" = 'available'
WHERE "availability" IS NULL;

UPDATE "workspaces"
SET "slots" = ARRAY[]::TEXT[]
WHERE "slots" IS NULL;

UPDATE "workspaces"
SET "description" = ''
WHERE "description" IS NULL;

UPDATE "workspaces"
SET "cancellation" = ''
WHERE "cancellation" IS NULL;

UPDATE "workspaces"
SET "hide_capacity" = false
WHERE "hide_capacity" IS NULL;

UPDATE "workspaces"
SET "simple_booking" = true
WHERE "simple_booking" IS NULL;

UPDATE "workspaces"
SET "created_at" = CURRENT_TIMESTAMP
WHERE "created_at" IS NULL;

UPDATE "workspaces"
SET "updated_at" = CURRENT_TIMESTAMP
WHERE "updated_at" IS NULL;


CREATE INDEX IF NOT EXISTS "workspaces_location_slug_idx"
    ON "workspaces"("location_slug");


-- ============================================================
-- AMENITIES
-- ============================================================

CREATE TABLE IF NOT EXISTS "amenities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_id" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'General',
    "icon" TEXT NOT NULL DEFAULT 'tag',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);


-- Add missing columns if amenities already existed.

ALTER TABLE "amenities"
    ADD COLUMN IF NOT EXISTS "name" TEXT,
    ADD COLUMN IF NOT EXISTS "name_id" TEXT,
    ADD COLUMN IF NOT EXISTS "category" TEXT,
    ADD COLUMN IF NOT EXISTS "icon" TEXT,
    ADD COLUMN IF NOT EXISTS "status" TEXT,
    ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);


-- Set defaults.

ALTER TABLE "amenities"
    ALTER COLUMN "name_id"
        SET DEFAULT '',
    ALTER COLUMN "category"
        SET DEFAULT 'General',
    ALTER COLUMN "icon"
        SET DEFAULT 'tag',
    ALTER COLUMN "status"
        SET DEFAULT 'active',
    ALTER COLUMN "created_at"
        SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "updated_at"
        SET DEFAULT CURRENT_TIMESTAMP;


-- Fill NULL values for existing rows.

UPDATE "amenities"
SET "name_id" = ''
WHERE "name_id" IS NULL;

UPDATE "amenities"
SET "category" = 'General'
WHERE "category" IS NULL;

UPDATE "amenities"
SET "icon" = 'tag'
WHERE "icon" IS NULL;

UPDATE "amenities"
SET "status" = 'active'
WHERE "status" IS NULL;

UPDATE "amenities"
SET "created_at" = CURRENT_TIMESTAMP
WHERE "created_at" IS NULL;

UPDATE "amenities"
SET "updated_at" = CURRENT_TIMESTAMP
WHERE "updated_at" IS NULL;


-- ============================================================
-- INITIAL LOCATION
-- ============================================================

INSERT INTO "locations" (
    "id",
    "slug",
    "name",
    "address",
    "city",
    "image_url",
    "hours",
    "access_247",
    "amenities",
    "description",
    "status"
)
SELECT
    'loc-sattabi-jb',
    'sattabi-johor-bahru',
    'TerraSpace Johor Bahru',
    'Johor Bahru, Malaysia',
    'Johor Darul Ta''zim, Malaysia',
    NULL,
    'Mon–Sun 09:00–22:00',
    false,
    ARRAY[
        'PA system',
        'Wi-Fi',
        'Whiteboard',
        'Pantry'
    ]::TEXT[],
    'A single bookable event space in Johor Bahru — open floor for launches, meetups and training sessions. Booking-first: pick a date and time, no headcount needed.',
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM "locations"
    WHERE "slug" = 'sattabi-johor-bahru'
);


-- ============================================================
-- INITIAL WORKSPACE
-- ============================================================

INSERT INTO "workspaces" (
    "id",
    "slug_id",
    "location_slug",
    "name",
    "type",
    "floor",
    "capacity",
    "price",
    "unit",
    "amenities",
    "availability",
    "slots",
    "image_url",
    "description",
    "cancellation",
    "hide_capacity",
    "simple_booking",
    "calendar_sync",
    "qr_provider"
)
SELECT
    'sattabi-jb-event-space',
    'sattabi-jb-event-space',
    'sattabi-johor-bahru',
    'Event Space',
    'Event Space',
    'Ground Floor',
    0,
    700000,
    'hour',
    ARRAY[
        'Open floor layout',
        'PA system',
        'Wi-Fi',
        'Whiteboard'
    ]::TEXT[],
    'available',
    ARRAY[
        '09:00',
        '11:00',
        '13:00',
        '15:00',
        '18:00'
    ]::TEXT[],
    NULL,
    'The one bookable room in Johor Bahru — an open event floor for launches, meetups and training days. Just pick your date and time and book, no capacity selection needed.',
    'Free cancellation up to 48 hours before the event.',
    true,
    true,
    'google-preview',
    'sattabi-preview'
WHERE NOT EXISTS (
    SELECT 1
    FROM "workspaces"
    WHERE "id" = 'sattabi-jb-event-space'
);


-- ============================================================
-- INITIAL AMENITIES
-- ============================================================

INSERT INTO "amenities" (
    "id",
    "name",
    "name_id",
    "category",
    "icon",
    "status"
)
SELECT
    'amenity-wifi',
    'Wi-Fi',
    'Wi-Fi',
    'Connectivity',
    'wifi',
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM "amenities"
    WHERE "id" = 'amenity-wifi'
);


INSERT INTO "amenities" (
    "id",
    "name",
    "name_id",
    "category",
    "icon",
    "status"
)
SELECT
    'amenity-pa',
    'PA system',
    'Sistem Suara (PA)',
    'AV',
    'monitor',
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM "amenities"
    WHERE "id" = 'amenity-pa'
);


INSERT INTO "amenities" (
    "id",
    "name",
    "name_id",
    "category",
    "icon",
    "status"
)
SELECT
    'amenity-whiteboard',
    'Whiteboard',
    'Papan Tulis',
    'AV',
    'pencil',
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM "amenities"
    WHERE "id" = 'amenity-whiteboard'
);


INSERT INTO "amenities" (
    "id",
    "name",
    "name_id",
    "category",
    "icon",
    "status"
)
SELECT
    'amenity-pantry',
    'Pantry',
    'Pantry',
    'Pantry',
    'coffee',
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM "amenities"
    WHERE "id" = 'amenity-pantry'
);