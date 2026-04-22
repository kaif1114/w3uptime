# 01 — Architecture

## One-liner

Everything runs on a single EC2 VM via `docker-compose.prod.yml`. Only Nginx
publishes host ports (80/443). Every other service is reachable only on the
internal Docker bridge network `app-network`.

## Component table

| Service | Image source | Container name | Internal port | Host-exposed? | Role |
|---|---|---|---|---|---|
| `nginx` | `nginx:1.27-alpine` | `nginx-prod` | 80, 443 | **Yes** (80/443) | Reverse proxy, TLS termination (once domain added) |
| `frontend` | `ghcr.io/<org>/w3uptime-frontend` (built from `apps/frontend/dockerfile`) | `frontend-prod` | 8000 | No | Next.js 15 SSR UI; also runs BullMQ escalation worker + 3 Sepolia listeners on boot |
| `hub` | `ghcr.io/<org>/w3uptime-hub` | `hub-prod` | 8080 | No | Express HTTP + `ws` WebSocket server; validators connect here |
| `data-ingestion` | `ghcr.io/<org>/w3uptime-data-ingestion` | `data-ingestion-prod` | 4001 | No | Batch `/batch` endpoint; called by hub and frontend |
| `timescaledb` | `timescale/timescaledb:latest-pg17` | `timescaledb-prod` | 5432 | No | Postgres 17 + timescaledb extension; data in the `timescaledb_data` volume |
| `redis` | `redis:7-alpine` | `redis-prod` | 6379 | No | BullMQ backing store for frontend escalation queue |

## What talks to what

```
                    ┌───────────────┐
Internet ──TLS──►   │    nginx      │ :80/:443 (only public ingress)
                    └───┬───────┬───┘
                        │       │
                        │       └── /hub/*  ── HTTP ──┐
                        │       └── /ws     ── WSS ──┤
                        │                            ▼
                        ▼ /                      ┌────────┐
                   ┌──────────┐                  │  hub   │
                   │ frontend │                  │ :8080  │
                   │  :8000   │                  └─┬──┬───┘
                   └──┬──┬────┘                    │  │
                      │  └──────┐                  │  │
                      │         └──── HTTP ────────┘  │
                      │                               │
                      │                     HTTP      │
                      │                   /batch      │
                      │                      ┌────────▼───────┐
                      │                      │ data-ingestion │
                      │                      │    :4001       │
                      │                      └────┬───────────┘
                      │                           │
                      │                           │
            ┌─────────┴────┐                      │
            ▼              ▼                      ▼
         ┌──────┐      ┌─────────────────────────────┐
         │redis │      │       timescaledb           │
         │:6379 │      │          :5432              │
         └──────┘      └─────────────────────────────┘
```

Off-host dependencies:

- Sepolia RPC via Alchemy (`ETHEREUM_RPC_URL`, `SEPOLIA_WS_URL`)
- Slack API (escalation alerts)
- Mapbox (frontend maps)
- OpenAI (AI assistant)
- Gmail SMTP (email alerts)
- End-users' validators connect inward via `wss://<host>/ws`

## Data flow (a single monitor tick)

1. Validator CLI (running on a user's laptop) holds an open WebSocket to the
   hub through `/ws`.
2. Hub's `monitorDistribution` picks a validator and sends a signed monitoring
   job over the socket.
3. Validator performs the HTTP check, signs the result with its ECDSA key,
   sends it back.
4. Hub verifies the signature (`services/signature.ts`), updates reputation,
   and POSTs batch to `data-ingestion /batch`.
5. `data-ingestion` inserts into the `MonitorTick` hypertable.
6. The `monitor_tick_notify_trigger` fires `pg_notify('monitor_update', ...)`.
7. Frontend (subscribed via `lib/pg.ts`) receives the notification and pushes
   the update to connected browser clients.
8. TimescaleDB continuous aggregates (5m / 30m / 2h) maintain the rolled-up
   views the dashboard queries.

## Why single-host

The user explicitly said they don't care how much load it handles for users.
Single-host docker-compose is:

- **Cheapest** — one `t3.medium` ≈ USD 30/month, no ALB, no NAT gateway.
- **Simplest to reason about** — one `docker compose logs` is the whole system.
- **Fully reversible** — to scale later (ECS, ALB, RDS-style DB), the
  Dockerfiles and compose file are already structured so each service can be
  lifted out individually.

If/when we need multi-host: the same images push to GHCR today; the ECS path
is a 2–3 day job, not a rewrite.

## Load balancer / reverse proxy decisions

Since we use a single Nginx (not an AWS ALB):

| Route | Target | Notes |
|---|---|---|
| `/` | `frontend:8000` | Catch-all for the Next.js app |
| `/hub/*` | `hub:8080` | HTTP API (`/hub/ping`, `/hub/validators`) |
| `/ws` | `hub:8080` | WebSocket upgrade; `proxy_read_timeout 3600s` |
| `/healthz` | (nginx itself) | Returns `ok`, cheap uptime probe |

Stickiness is not needed: there's only one hub instance.
