-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('customer', 'staff', 'admin');

-- CreateEnum
CREATE TYPE "location_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "amenity_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "workspace_type" AS ENUM ('hot_desk', 'dedicated_desk', 'private_office', 'meeting_room', 'event_space');

-- CreateEnum
CREATE TYPE "workspace_availability" AS ENUM ('available', 'limited', 'full', 'maintenance', 'disabled');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "payment_provider" AS ENUM ('xendit', 'midtrans');

-- CreateEnum
CREATE TYPE "payment_state" AS ENUM ('pending', 'awaiting_payment', 'paid', 'failed', 'expired', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "refund_state" AS ENUM ('pending', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "webhook_state" AS ENUM ('received', 'processed', 'ignored', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'customer',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "ban_reason" TEXT,
    "ban_expires" TIMESTAMPTZ(6),
    "phone" VARCHAR(30),
    "company" VARCHAR(150),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "impersonated_by" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "password" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ(6),
    "refresh_token_expires_at" TIMESTAMPTZ(6),
    "scope" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" TEXT NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "image_url" TEXT,
    "opening_hours" TEXT NOT NULL DEFAULT 'Mon–Sun 09:00–22:00',
    "access_24_7" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL DEFAULT '',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "access_radius_meters" INTEGER NOT NULL DEFAULT 50,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
    "status" "location_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "location_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "workspace_type" NOT NULL,
    "floor" VARCHAR(50) NOT NULL DEFAULT '',
    "price_per_hour" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "availability" "workspace_availability" NOT NULL DEFAULT 'available',
    "simple_booking" BOOLEAN NOT NULL DEFAULT false,
    "image_url" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "cancellation_policy" TEXT NOT NULL DEFAULT '',
    "calendar_sync_provider" VARCHAR(50),
    "qr_provider" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "name_id" VARCHAR(100),
    "category" VARCHAR(50) NOT NULL DEFAULT 'General',
    "icon" VARCHAR(50) NOT NULL DEFAULT 'tag',
    "status" "amenity_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_amenities" (
    "workspace_id" UUID NOT NULL,
    "amenity_id" UUID NOT NULL,

    CONSTRAINT "workspace_amenities_pkey" PRIMARY KEY ("workspace_id","amenity_id")
);

-- CreateTable
CREATE TABLE "location_amenities" (
    "location_id" UUID NOT NULL,
    "amenity_id" UUID NOT NULL,

    CONSTRAINT "location_amenities_pkey" PRIMARY KEY ("location_id","amenity_id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "booking_date" DATE NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "duration_hours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "subtotal_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
    "payment_status" "payment_status" NOT NULL DEFAULT 'pending',
    "status" "booking_status" NOT NULL DEFAULT 'pending',
    "reference" VARCHAR(50) NOT NULL,
    "access_code" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_settings" (
    "id" BOOLEAN NOT NULL DEFAULT true,
    "company_name" VARCHAR(150) NOT NULL DEFAULT 'TerraSpace',
    "support_email" VARCHAR(255),
    "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
    "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "cancellation_window_hours" INTEGER NOT NULL DEFAULT 24,
    "advance_booking_days" INTEGER NOT NULL DEFAULT 30,
    "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL,
    "paybridge_charge_id" TEXT NOT NULL,
    "paybridge_order_id" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "payment_state" NOT NULL DEFAULT 'pending',
    "checkout_url" TEXT,
    "payment_method_code" TEXT,
    "payment_method_category" TEXT,
    "provider_charge_id" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "expired_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID,
    "paybridge_order_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "key_id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "raw_body" TEXT NOT NULL,
    "status" "webhook_state" NOT NULL DEFAULT 'received',
    "error" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "paybridge_refund_id" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "reason" VARCHAR(500),
    "status" "refund_state" NOT NULL,
    "requested_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_id_account_id_key" ON "accounts"("provider_id", "account_id");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE INDEX "verifications_expires_at_idx" ON "verifications"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "locations_slug_key" ON "locations"("slug");

-- CreateIndex
CREATE INDEX "locations_city_status_idx" ON "locations"("city", "status");

-- CreateIndex
CREATE INDEX "workspaces_location_id_availability_idx" ON "workspaces"("location_id", "availability");

-- CreateIndex
CREATE INDEX "workspaces_type_availability_idx" ON "workspaces"("type", "availability");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities"("name");

-- CreateIndex
CREATE INDEX "amenities_category_status_idx" ON "amenities"("category", "status");

-- CreateIndex
CREATE INDEX "workspace_amenities_amenity_id_workspace_id_idx" ON "workspace_amenities"("amenity_id", "workspace_id");

-- CreateIndex
CREATE INDEX "location_amenities_amenity_id_location_id_idx" ON "location_amenities"("amenity_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_access_code_key" ON "bookings"("access_code");

-- CreateIndex
CREATE INDEX "bookings_user_id_booking_date_idx" ON "bookings"("user_id", "booking_date" DESC);

-- CreateIndex
CREATE INDEX "bookings_workspace_id_booking_date_idx" ON "bookings"("workspace_id", "booking_date");

-- CreateIndex
CREATE INDEX "bookings_status_booking_date_idx" ON "bookings"("status", "booking_date");

-- CreateIndex
CREATE INDEX "bookings_payment_status_created_at_idx" ON "bookings"("payment_status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "payments_paybridge_charge_id_key" ON "payments"("paybridge_charge_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paybridge_order_id_key" ON "payments"("paybridge_order_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_created_at_idx" ON "payments"("booking_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_nonce_key" ON "payment_events"("nonce");

-- CreateIndex
CREATE INDEX "payment_events_status_received_at_idx" ON "payment_events"("status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_paybridge_order_id_event_key" ON "payment_events"("paybridge_order_id", "event");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_paybridge_refund_id_key" ON "refunds"("paybridge_refund_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_amenities" ADD CONSTRAINT "workspace_amenities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_amenities" ADD CONSTRAINT "workspace_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_amenities" ADD CONSTRAINT "location_amenities_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_amenities" ADD CONSTRAINT "location_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- Hand-written — everything Prisma's schema language cannot express.
-- See development-phases.md Phase 1 and erd-spec.md §13, §16.
-- ─────────────────────────────────────────────────────────────

-- Extensions (also seeded by docker/postgres/init/01-extensions.sql on a
-- fresh volume — repeated here so every migration target, including a
-- Testcontainers-spun database, is self-contained).
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- No-double-booking constraint (erd-spec.md §13).
-- Generated column: the booking's [start, end) instant range in venue-local
-- terms, combining booking_date with start_time/end_time.
ALTER TABLE "bookings" ADD COLUMN "booking_period" tsrange
  GENERATED ALWAYS AS (
    tsrange(booking_date + start_time, booking_date + end_time, '[)')
  ) STORED;

CREATE INDEX "bookings_workspace_id_booking_period_idx"
  ON "bookings" USING gist ("workspace_id", "booking_period");

-- The exclusion constraint is the single load-bearing guarantee of the
-- whole booking model — proven by an integration test, not by this
-- migration (see tests/integration/booking-overlap.test.js).
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (workspace_id WITH =, booking_period WITH &&)
  WHERE (status IN ('pending', 'confirmed'));

-- No-double-charging constraint (payments.md §2).
CREATE UNIQUE INDEX "payments_one_paid_per_booking"
  ON "payments" ("booking_id") WHERE (status = 'paid');

-- CHECK constraints — erd-spec.md §8–15.

ALTER TABLE "locations" ADD CONSTRAINT "locations_latitude_check"
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
ALTER TABLE "locations" ADD CONSTRAINT "locations_longitude_check"
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
ALTER TABLE "locations" ADD CONSTRAINT "locations_access_radius_meters_check"
  CHECK (access_radius_meters > 0);

ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_price_per_hour_check"
  CHECK (price_per_hour >= 0);

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_time_range_check"
  CHECK (start_time < end_time);
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_min_duration_check"
  CHECK (end_time - start_time >= INTERVAL '30 minutes');
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_unit_price_check"
  CHECK (unit_price >= 0);
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_duration_hours_check"
  CHECK (duration_hours > 0);
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_total_amount_check"
  CHECK (total_amount = subtotal_amount + tax_amount);
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_cancelled_at_check"
  CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL));

ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_id_check"
  CHECK (id = true);
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_tax_percent_check"
  CHECK (tax_percent BETWEEN 0 AND 100);
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_cancellation_window_hours_check"
  CHECK (cancellation_window_hours >= 0);
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_advance_booking_days_check"
  CHECK (advance_booking_days >= 0);
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_currency_check"
  CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_minor_check"
  CHECK (amount_minor > 0);

ALTER TABLE "refunds" ADD CONSTRAINT "refunds_amount_minor_check"
  CHECK (amount_minor > 0);
