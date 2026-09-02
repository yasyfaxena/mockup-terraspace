-- TerraSpace is USD-only; drop the last "idr" naming from the schema.
-- The stored value itself doesn't change (it was never rupiah, just a
-- base unit that display code converts to USD), only the column name.

ALTER TABLE "bookings"
    RENAME COLUMN "total_idr" TO "total_amount";

-- Fix admin_settings: currency column defaulted to 'IDR' and the seed
-- row was inserted with 'IDR'. Correct both to USD.

ALTER TABLE "admin_settings"
    ALTER COLUMN "currency" SET DEFAULT 'USD';

UPDATE "admin_settings"
    SET "currency" = 'USD'
    WHERE "currency" = 'IDR';
