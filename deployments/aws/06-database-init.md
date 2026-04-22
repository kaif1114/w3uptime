# 06 — Database initialization

This is a **one-time** setup. Run it the very first time you bring up the
stack on a fresh EC2 host. Afterwards Prisma migrations + the existing
continuous aggregates carry forward by themselves.

## Ordering (important)

1. Start **only** the `timescaledb` container — so nothing else reads from it.
2. Let the container's init scripts create the `timescaledb` extension.
3. Run Prisma migrations (creates all the tables, including `MonitorTick`).
4. Apply `packages/db/queries/setup.sql` (converts `MonitorTick` into a
   hypertable and creates continuous aggregates).
5. Apply `packages/db/queries/triggers.sql` (pg_notify triggers).
6. Then bring up everything else.

Doing migrations before `setup.sql` matters: `create_hypertable` needs the
table to exist.

## Step 1 — Start only TimescaleDB

```bash
cd /opt/w3uptime
docker compose -f docker-compose.prod.yml up -d timescaledb
docker compose -f docker-compose.prod.yml logs -f timescaledb
# Wait for "database system is ready to accept connections"
# and for the init script "01-init-timescale.sql" to run.
# Ctrl+C to stop following logs.
```

Confirm the extension is in place:

```bash
docker compose -f docker-compose.prod.yml exec timescaledb \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\dx'
# timescaledb row must appear.
```

## Step 2 — Run Prisma migrations

We use a **one-off container** so we don't have to install Node on the host.

```bash
cd /opt/w3uptime

# Pull a Node image that matches the Dockerfiles
docker run --rm \
  --network w3uptime-prod_app-network \
  -v "$PWD":/app -w /app \
  --env-file .env \
  -e DATABASE_URL="$DATABASE_URL" \
  node:20-alpine sh -c '
    apk add --no-cache libc6-compat openssl >/dev/null 2>&1 || true
    npm install --workspace=db --include-workspace-root --no-audit --no-fund
    npx prisma migrate deploy --schema=./packages/db/prisma/schema.prisma
  '
```

You should see each migration in `packages/db/prisma/migrations/` reported as
applied.

> **Troubleshooting**: if Prisma says it can't reach `timescaledb`, check that
> the network name from `docker network ls` matches `w3uptime-prod_app-network`.
> Adjust the `--network` flag accordingly.

## Step 3 — Apply `setup.sql` (hypertables + continuous aggregates)

```bash
docker compose -f docker-compose.prod.yml exec -T timescaledb \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < packages/db/queries/setup.sql
```

Verify:

```bash
docker compose -f docker-compose.prod.yml exec timescaledb \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT hypertable_name FROM timescaledb_information.hypertables;"
# → MonitorTick

docker compose -f docker-compose.prod.yml exec timescaledb \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dv monitor_tick_*"
# → several continuous aggregates (5min/30min/2hour, global + country + continent)
```

## Step 4 — Apply `triggers.sql`

```bash
docker compose -f docker-compose.prod.yml exec -T timescaledb \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < packages/db/queries/triggers.sql
```

Verify:

```bash
docker compose -f docker-compose.prod.yml exec timescaledb \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT tgname FROM pg_trigger WHERE tgrelid = '\"MonitorTick\"'::regclass;"
# → monitor_tick_notify_trigger
# → monitor_last_checked_update_trigger
```

## Step 5 — Done

The DB is now ready. Proceed to [`08-start-services.md`](./08-start-services.md)
to bring up the rest of the stack.

---

## Re-running later

- **After a new Prisma migration is committed**: the CI/CD pipeline runs
  `npx prisma migrate deploy` as part of the deploy (see doc 09), so you don't
  need to re-run step 2 by hand.
- **After changes to `setup.sql` / `triggers.sql`**: re-run steps 3 and 4
  manually. Both files are written to be idempotent (`CREATE OR REPLACE`,
  `IF NOT EXISTS`), so re-running is safe.

## Backup + restore

See [`13-operations.md`](./13-operations.md) for AWS Backup / EBS snapshot
setup and manual `pg_dump`/`pg_restore`.
