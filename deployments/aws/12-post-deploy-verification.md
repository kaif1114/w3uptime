# 12 — Post-deploy end-to-end verification

Run this the first time you bring the stack up, and again after any change
touching auth, hub, or data-ingestion.

## 1. Service-level checks (on the EC2 host)

```bash
cd /opt/w3uptime
docker compose -f docker-compose.prod.yml ps
```

All of `timescaledb`, `redis`, `data-ingestion`, `hub`, `frontend`, `nginx`
must be **Up (healthy)** (nginx has no healthcheck — just `Up`).

## 2. Database sanity

```bash
set -a; . .env; set +a

docker compose -f docker-compose.prod.yml exec timescaledb \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'SQL'
\dx
SELECT hypertable_name FROM timescaledb_information.hypertables;
SELECT tgname FROM pg_trigger WHERE tgrelid = '"MonitorTick"'::regclass;
\dv monitor_tick_*
SQL
```

Expect:

- `timescaledb` in `\dx` output.
- `MonitorTick` listed as a hypertable.
- Both `monitor_tick_notify_trigger` and `monitor_last_checked_update_trigger`
  present.
- At least a dozen `monitor_tick_*` materialized views.

## 3. HTTP surface

From your laptop:

```bash
HOST=<ec2-public-dns>   # or elastic IP

curl -sS http://$HOST/healthz                  # → ok
curl -sS http://$HOST/api/health | jq          # → { success: true, … }
curl -sS http://$HOST/hub/ping | jq            # → { "status": "OK" }
```

## 4. WebSocket

```bash
wscat -c ws://$HOST/ws
# → Connected
```

Leave the session open and watch the hub logs in another pane:

```bash
docker compose -f docker-compose.prod.yml logs -f hub
# → "Client connected" appears right after wscat connects
```

## 5. End-user journey (MetaMask + monitor creation)

1. Open `http://$HOST/` in Chrome with MetaMask installed.
2. Click "Get started" / Sign in with MetaMask → approve.
3. Create a monitor for any public URL (e.g. `https://example.com`, 60s
   interval).
4. Wait ~90 seconds for a validator to be assigned. (If no validators are
   connected yet, skip to step 7 first.)
5. Watch the dashboard: latency and uptime chart tiles should populate.
6. Confirm a DB row arrived:

   ```bash
   docker compose -f docker-compose.prod.yml exec timescaledb \
     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
     -c 'SELECT COUNT(*) FROM "MonitorTick";'
   ```

## 6. Governance flow (Sepolia)

1. MetaMask → switch to **Sepolia**. Get test ETH from
   <https://sepoliafaucet.com> if needed.
2. UI → **Community → Governance** → create a short test proposal.
3. Confirm the MetaMask tx.
4. On Sepolia Etherscan, open the contract at
   `0xe74cedb2ec8ca7607f95297e938078e4ebae304f` → the tx should appear in the
   "Transactions" tab within a couple of minutes.

## 7. Validator CLI from a clean machine

```bash
# On any laptop with Node 20:
npm i -g https://github.com/<org>/w3uptime/releases/download/validator-v1.0.0/w3uptime-validator-1.0.0.tgz

# Point it at our hub
w3uptime-validator config set hub.url ws://$HOST/ws

# Initialize with a test wallet (create a fresh MetaMask account just for
# testing; don't use a real-funds key)
w3uptime-validator init --private-key 0xYOUR_TEST_PK --wallet-name testnet

# Start
w3uptime-validator start
```

Expected output:

- Validator logs `Connected to hub`.
- Hub logs `Client connected`.
- Within a minute, the frontend's "Active validators" count increments.

## 8. CI/CD round-trip

```bash
# From your laptop
cd w3uptime
echo "# CI smoke" >> docs/blockchain-listeners.md
git commit -am "ci: smoke"
git push
```

- GitHub Actions → the `Deploy to EC2` workflow starts.
- Both jobs finish green.
- On the host, `cat /opt/w3uptime/.env.images` shows the new SHA.
- `docker compose -f docker-compose.prod.yml ps` shows all services restarted
  with the new image IDs.
- `curl http://$HOST/api/health` still returns 200.

## Exit criteria

If all eight steps pass, the deployment is **green** and ready to hand to
early testers.

If any step fails, check [`08-start-services.md`](./08-start-services.md) →
"Common problems" and the service logs before moving on.
