# 13 — Operations

Day-2 runbook: backups, logs, rollback, common admin tasks.

## Backups

### Daily EBS snapshot (recommended, zero-ops)

EC2 → Elastic Block Store → **Lifecycle Manager** → Create a snapshot
lifecycle policy:

- Target resource type: Volume
- Target tags: `Name=w3uptime-prod` (apply to your root volume if not already)
- Schedule: daily at 03:00 UTC
- Retention: 14 snapshots
- Enable fast snapshot restore: No (cost)

Restore is just "Create volume from snapshot" → detach old root from a freshly
launched instance and swap — expect ~15–30 min of downtime.

### Postgres logical backup (for off-site copy)

```bash
cd /opt/w3uptime
set -a; . .env; set +a

docker compose -f docker-compose.prod.yml exec -T timescaledb \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  > /tmp/w3uptime-$(date +%F).dump

# Copy off the box
scp -i ~/.ssh/w3uptime_ec2 \
  ubuntu@<eip>:/tmp/w3uptime-*.dump \
  ~/backups/
```

Restore into a clean DB:

```bash
docker compose -f docker-compose.prod.yml exec -T timescaledb \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  < w3uptime-YYYY-MM-DD.dump
# Then re-apply setup.sql + triggers.sql (see doc 06 steps 3+4)
```

> Hypertables dump cleanly in `pg_dump` custom format; continuous aggregate
> views and triggers won't — that's why `setup.sql`/`triggers.sql` must be
> re-applied after a restore.

## Logs

### Live tailing

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=200
# or a single service:
docker compose -f docker-compose.prod.yml logs -f --tail=500 hub
```

### Where logs live

`/var/lib/docker/containers/<container-id>/<container-id>-json.log`, rotated
by the `daemon.json` we set in doc 04: 10 MB × 3 files per container, or
about 120 MB total worst-case.

### CloudWatch (optional)

Not wired up by default — the single-host docker log-driver is sufficient.
If you want aggregation, swap the Docker daemon log driver to `awslogs` and
attach an IAM instance profile with `CloudWatchAgentServerPolicy`.

## Deploy rollback

See [doc 09 → Rolling back](./09-cicd-github-actions.md#rolling-back). TL;DR:
point `.env.images` at a previous SHA, re-pull, up.

## Scaling knobs (single host)

| Knob | Where | When to touch |
|---|---|---|
| EC2 instance size | AWS console → Stop → Change instance type | Frontend OOM, slow TimescaleDB queries |
| EBS volume size | Elastic Block Store → Modify | `df -h /` > 80% |
| Postgres `shared_buffers`, `work_mem` | Mount a Postgres config file; for now TS defaults are fine | Query slowness at scale |
| Per-container memory limits | add `deploy.resources.limits.memory` in compose | One greedy service OOMs the box |

## Getting a shell inside a container

```bash
docker compose -f docker-compose.prod.yml exec hub sh
docker compose -f docker-compose.prod.yml exec frontend sh
docker compose -f docker-compose.prod.yml exec timescaledb bash
```

## Running a one-off script

Example: the existing `scripts/finalize-proposals.ts` (governance finalizer)
— normally the frontend schedules it via `ENABLE_AUTO_FINALIZATION=true`, but
if you need to run it by hand:

```bash
docker compose -f docker-compose.prod.yml exec frontend \
  node -e "require('./workers/escalationWorker.js')"
# …or, for arbitrary tsx scripts, spin up a one-off Node container:
docker run --rm --network w3uptime-prod_app-network \
  --env-file /opt/w3uptime/.env \
  -v /opt/w3uptime:/app -w /app node:20-alpine \
  sh -c 'npm i tsx --no-save && npx tsx scripts/finalize-proposals.ts'
```

## Swapping the Sepolia RPC

If the Alchemy free tier runs out:

1. Update `ETHEREUM_RPC_URL`, `SEPOLIA_WS_URL`, `ALCHEMY_API_KEY` in
   `/opt/w3uptime/.env`.
2. `docker compose -f docker-compose.prod.yml up -d frontend`.

The blockchain listeners come up fresh on restart; there's no state to
preserve.

## Upgrading the OS

Ubuntu 22.04 LTS is supported until April 2027. For minor upgrades,
`unattended-upgrades` (installed in doc 04) handles security patches
automatically. For the 22.04 → 24.04 jump, snapshot first, then:

```bash
sudo do-release-upgrade -d
```

Test everything after; nothing in the stack is tied to a specific kernel or
libc.

## Cost sheet (rough, ap-south-1)

| Resource | Monthly |
|---|---|
| EC2 `t3.medium` on-demand | ~ USD 30 |
| 50 GB gp3 | ~ USD 4 |
| Elastic IP (attached) | free |
| Daily EBS snapshots × 14 | ~ USD 2 |
| Data out (light usage, ~10 GB) | ~ USD 1 |
| **Total** | **~ USD 37/month** |

External SaaS (Alchemy free tier, Mapbox free tier, Slack free, Gmail, OpenAI
per-use) not included.
