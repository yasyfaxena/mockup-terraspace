-- Drop group-size fields: "people"/"capacity" are no longer used anywhere
-- in the app (search, detail, booking, or admin). Workspaces are booked
-- as whole rooms without a capacity/headcount selector.

ALTER TABLE "bookings"
    DROP COLUMN IF EXISTS "people";

ALTER TABLE "workspaces"
    DROP COLUMN IF EXISTS "capacity";

ALTER TABLE "workspaces"
    DROP COLUMN IF EXISTS "hide_capacity";
