# 08 — Start the stack

With the DB initialized (doc 06), bring up everything else.

## First start

```bash
cd /opt/w3uptime

# Build the images locally the first time. CI/CD replaces this with a pull
# from GHCR in every later deploy.
docker compose -f docker-compose.prod.yml build

# Boot the full stack. TimescaleDB is already running from doc 06 — compose
# will leave it alone and start the rest.
docker compose -f docker-compose.prod.yml up -d

# Watch everything come up
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

Expected end state (`ps` output):

```
NAME                  STATUS
timescaledb-prod      Up (healthy)
redis-prod            Up (healthy)
data-ingestion-prod   Up (healthy)
hub-prod              Up (healthy)
frontend-prod         Up (healthy)
nginx-prod            Up
```

All five "healthy" healthchecks must pass. `start_period` is set to 40s–60s,
so give it ~2 minutes.

## Smoke tests from the host

```bash
# Nginx is responding
curl -sS http://localhost/healthz
# → ok

# Frontend health endpoint (proxied through nginx)
curl -sS http://localhost/api/health | jq
# → { "success": true, "services": { … } }

# Hub ping (proxied through nginx)
curl -sS http://localhost/hub/ping
# → {"status":"OK"}

# data-ingestion is internal-only — verify from inside the network
docker compose -f docker-compose.prod.yml exec hub wget -qO- http://data-ingestion:4001/ping
# → {"message":"pong"}
```

## Smoke tests from your laptop

Using the EC2 public DNS or Elastic IP:

```bash
curl -sS http://<ec2-public-dns>/healthz
curl -sS http://<ec2-public-dns>/hub/ping
open http://<ec2-public-dns>          # browser: the W3Uptime UI should load
```

## Verifying the WebSocket upgrade path

```bash
# From your laptop
npm i -g wscat
wscat -c ws://<ec2-public-dns>/ws
# → "Connected (press CTRL+C to quit)"
# Send anything — hub will reject unsigned messages, which is expected.
```

## Common problems

| Symptom | Likely cause |
|---|---|
| `frontend` restarts repeatedly | `REDIS_HOST` unreachable or `DATABASE_URL` wrong. Check `docker compose logs frontend`. |
| `hub` healthy but `/hub/ping` 502s | Nginx can't reach `hub:8080`. Usually a typo in `docker/nginx/nginx.conf`. Run `nginx -t` inside the container. |
| `data-ingestion` unhealthy | Container lacks `wget` in newer Alpine images. The healthcheck in compose uses `wget -qO- …`. If your base image drops wget, swap for `curl`. |
| TimescaleDB fails healthcheck | Usually wrong `POSTGRES_USER` / `POSTGRES_DB` mismatched with `.env`. Inspect with `docker logs timescaledb-prod`. |
| Browser loads but MetaMask fails to sign | `NEXT_PUBLIC_URL` doesn't match the origin the browser is using. Update `.env`, `docker compose up -d frontend` to reload. |

## Restarting a single service

```bash
docker compose -f docker-compose.prod.yml restart hub
docker compose -f docker-compose.prod.yml logs -f hub
```

## Full restart (preserves DB/Redis data — they're on volumes)

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

## Nuke and pave (destroys DB data!)

```bash
# Only if you really want to wipe everything:
docker compose -f docker-compose.prod.yml down -v
# Then re-run doc 06 + this doc.
```

---

Next: set up CI/CD — [`09-cicd-github-actions.md`](./09-cicd-github-actions.md).
