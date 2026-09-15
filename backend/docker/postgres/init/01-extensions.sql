-- docker/postgres/init/01-extensions.sql
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- exclusion constraint on bookings
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid()
