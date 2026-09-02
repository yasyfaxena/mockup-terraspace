CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" TEXT NOT NULL,
  "full_name" TEXT NOT NULL DEFAULT '',
  "phone" TEXT,
  "company" TEXT,
  "role" TEXT NOT NULL DEFAULT 'customer',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "bookings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL,
  "workspace_id" TEXT NOT NULL,
  "workspace_name" TEXT NOT NULL,
  "location_slug" TEXT NOT NULL,
  "booking_date" DATE NOT NULL,
  "start_time" TEXT NOT NULL,
  "end_time" TEXT NOT NULL,
  "people" INTEGER NOT NULL DEFAULT 1,
  "total_idr" BIGINT NOT NULL DEFAULT 0,
  "method" TEXT NOT NULL DEFAULT 'card',
  "status" TEXT NOT NULL DEFAULT 'confirmed',
  "reference" TEXT NOT NULL,
  "access_code" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_reference_key" ON "bookings"("reference");

CREATE TABLE IF NOT EXISTS "guests" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "booking_id" TEXT NOT NULL,
  "guest_name" TEXT NOT NULL,
  "guest_email" TEXT,
  "access_from" TEXT,
  "access_until" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "admin_settings" (
  "id" BOOLEAN NOT NULL DEFAULT TRUE,
  "company_name" TEXT NOT NULL DEFAULT 'TerraSpace',
  "support_email" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'IDR',
  "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "cancellation_window_hours" INTEGER NOT NULL DEFAULT 24,
  "advance_booking_days" INTEGER NOT NULL DEFAULT 30,
  "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey"
    FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "guests" ADD CONSTRAINT "guests_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO "admin_settings" ("id","company_name","currency","tax_percent","cancellation_window_hours","advance_booking_days","email_notifications_enabled","updated_at")
VALUES (TRUE,'TerraSpace','IDR',0,24,30,TRUE,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
