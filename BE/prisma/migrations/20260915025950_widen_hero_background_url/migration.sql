-- The hero background field now accepts either a pasted URL or a file
-- uploaded from the admin (encoded client-side as a `data:` URI — see
-- FE's ImageField, already used by workspaces/locations imageUrl, which
-- are plain unbounded TEXT columns). VARCHAR(500) was fine for a link but
-- rejects any uploaded image, so this widens the column the same way.
ALTER TABLE "admin_settings"
  ALTER COLUMN "hero_background_url" TYPE TEXT;
