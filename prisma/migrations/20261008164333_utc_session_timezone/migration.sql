-- Prisma's Postgres driver adapter sends and reads timestamps as UTC wall-clock text, so it
-- is only correct when the session time zone is UTC. Pin it at the database level so every
-- connection (the app, the Prisma CLI, a connection pooler) starts in UTC, whatever the
-- server's own default is.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO ''UTC''', current_database());
END
$$;
