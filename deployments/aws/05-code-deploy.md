# 05 — Code deploy + env configuration

Clone the repo onto the EC2 host and fill in `.env`.

## Clone

```bash
# On the EC2 host (still as the `ubuntu` user):
cd /opt/w3uptime
git clone https://github.com/<your-org>/w3uptime.git .
# Private repo? Use a deploy key or HTTPS PAT. The workflow in doc 09 later
# switches this to a non-interactive pull; for now `git clone` interactively
# is fine.
```

If the repo is private, the simplest first-time approach is:

```bash
# Generate a read-only deploy key on the host…
ssh-keygen -t ed25519 -f ~/.ssh/w3uptime_deploy -C "ec2 deploy"
cat ~/.ssh/w3uptime_deploy.pub    # ← add this as a READ-ONLY deploy key on GitHub

# …then configure git to use it:
cat >> ~/.ssh/config <<EOF
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/w3uptime_deploy
EOF
chmod 600 ~/.ssh/config

git clone git@github.com:<your-org>/w3uptime.git /opt/w3uptime
```

## Create `.env`

```bash
cd /opt/w3uptime
cp .env.production.example .env
```

Edit `/opt/w3uptime/.env` (use `nano .env` or `vi .env`). Below is the
**complete reference** — every variable the services read.

> **Tip:** keep a local copy of the filled `.env` somewhere safe (a password
> manager). You'll need to recreate it if you ever rebuild the host.

### Required — no sane defaults

| Variable | Source / how to get it |
|---|---|
| `POSTGRES_DB` | pick a name, e.g. `w3uptime` |
| `POSTGRES_USER` | e.g. `postgres` |
| `POSTGRES_PASSWORD` | **generate**: `openssl rand -base64 32` |
| `DATABASE_URL` | compose it: `postgresql://<USER>:<PASSWORD>@timescaledb:5432/<DB>` (note the host is the compose service name, not `localhost`) |
| `ETHEREUM_RPC_URL` | Alchemy Sepolia HTTPS URL |
| `SEPOLIA_WS_URL` | Alchemy Sepolia WSS URL |
| `ALCHEMY_API_KEY` | Alchemy dashboard |
| `AUTHORIZED_SIGNER_KEY` | Platform signer EOA private key (used for governance finalization, not the validator) |
| `PLATFORM_SIGNER_ADDRESS` | EOA public address matching the key above |
| `NEXT_PUBLIC_URL` | e.g. `http://ec2-3-110-xx-xx.ap-south-1.compute.amazonaws.com` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox account → tokens |
| `SLACK_BOT_TOKEN` / `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` / `NEXT_PUBLIC_SLACK_CLIENT_ID` | Slack app config |
| `SLACK_REDIRECT_URI` | `<NEXT_PUBLIC_URL>/slack/callback` |
| `GOOGLE_APP_USER` / `GOOGLE_APP_PASSWORD` | Gmail account + Google App Password |
| `OPENAI_API_KEY` | OpenAI dashboard |
| `ABSTRACTAPI_KEY` | AbstractAPI for IP geolocation |

### Already have good defaults

| Variable | Default | When to change |
|---|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` (Sepolia) | Only when moving off Sepolia |
| `NEXT_PUBLIC_GOVERNANCE_CONTRACT_ADDRESS` | `0xe74ced…304f` | Only if the contract is redeployed |
| `ENABLE_AUTO_FINALIZATION` | `true` | Disable to stop the finalizer cron |
| `FINALIZATION_INTERVAL_MS` | `900000` (15m) | Tune frequency |
| `OPENAI_MODEL` | `gpt-5` | Pick a cheaper model for testing |
| `CHAT_RATE_LIMIT_PER_MINUTE` | `20` | — |
| `SESSION_EXPIRY_DAYS` | `7` | — |
| `FRONTEND_IMAGE`, `HUB_IMAGE`, `DATA_INGESTION_IMAGE` | `w3uptime-*:latest` (local build) | CI/CD overrides these to `ghcr.io/…:<sha>` via `.env.images` (see doc 09) |

### Auto-provided by compose (don't set)

These are injected in `docker-compose.prod.yml` using the compose network's
service names:

- `HUB_URL=http://hub:8080`
- `DATA_INGESTION_URL=http://data-ingestion:4001`
- `FRONTEND_URL=http://frontend:8000`
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`

## Validate

```bash
# Lint the env file (no unbound variables, no typos):
cd /opt/w3uptime
set -a; . ./.env; set +a
# Print a few critical ones:
echo "DB: $DATABASE_URL"
echo "RPC: $ETHEREUM_RPC_URL"
echo "Contract: $NEXT_PUBLIC_GOVERNANCE_CONTRACT_ADDRESS"
```

Nothing should print empty.

## Permissions

```bash
chmod 600 /opt/w3uptime/.env     # secrets, restrict to current user
```

---

Next: initialize the database — [`06-database-init.md`](./06-database-init.md).
