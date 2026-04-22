# 09 — CI/CD with GitHub Actions

Every push to `main` builds fresh Docker images, pushes them to GHCR, and
SSHes into the EC2 host to `docker compose pull && up -d`.

Workflow file: [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml)

## What it does

```
push to main
   │
   ▼
build-and-push  ──────  docker buildx   ──►  ghcr.io/<org>/w3uptime-frontend:<sha>
   │                                         ghcr.io/<org>/w3uptime-hub:<sha>
   │                                         ghcr.io/<org>/w3uptime-data-ingestion:<sha>
   ▼
deploy
   │
   ├── ssh ubuntu@<ec2> …
   ├── git pull                          (compose + nginx config updates)
   ├── docker login ghcr.io              (read-only token)
   ├── write .env.images pinning <sha>
   ├── docker compose pull frontend hub data-ingestion
   ├── docker compose up -d
   └── docker image prune -f
```

Prisma migrations are **not** run automatically. We keep them manual so a bad
migration can't break the site on autopilot. See doc 06 step 2 for the
one-off command you run after merging migration PRs.

## GitHub setup — one-time

### 1. Create a GHCR read-only PAT for the EC2 host

GitHub → Settings → Developer settings → Personal access tokens →
**Fine-grained tokens** → **Generate new token**.

- Name: `w3uptime-ec2-ghcr-read`
- Resource owner: your GitHub org or user
- Repository access: **Only** the `w3uptime` repo
- Permissions: **Packages → Read** (and nothing else)

Save the token string.

### 2. Create an EC2 SSH deploy key

On the EC2 host (if you didn't already in doc 05):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/w3uptime_deploy -C "ec2 deploy"
cat ~/.ssh/w3uptime_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Copy the **private** key (`~/.ssh/w3uptime_deploy`) to your laptop; you'll
paste it into GitHub below.

### 3. Add repository secrets

GitHub → the repo → Settings → Secrets and variables → **Actions** → New
repository secret:

| Secret | Value |
|---|---|
| `EC2_HOST` | Elastic IP of the instance |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contents of `~/.ssh/w3uptime_deploy` (private key, include `-----BEGIN…` and `-----END…`) |
| `GHCR_READ_TOKEN` | The fine-grained PAT from step 1 |

### 4. Create a Production environment

GitHub → the repo → Settings → **Environments** → New environment →
`production`. Optionally add required reviewers so deploys wait for a manual
click.

## First run

Push any commit to `main` (or use the **Run workflow** button on the
**Actions** tab). Watch both jobs:

1. `build-and-push` takes 4–8 min the first time (no cache). Subsequent runs
   are ~1–2 min thanks to `cache-from: type=gha`.
2. `deploy` should take ~30–60s.

## Verifying a deploy landed

```bash
ssh -i ~/.ssh/w3uptime_ec2 ubuntu@<eip>
cd /opt/w3uptime

cat .env.images   # shows the pinned :<sha> tags
docker compose -f docker-compose.prod.yml images
# Each service's image ID should match the one GHCR has for that sha.

# Check git is at the same commit:
git log -1 --format=%H
```

## Rolling back

Fastest: push a revert commit — CI will build and deploy it. Or, to snap back
to a previous SHA without waiting for a build:

```bash
# On the host
cd /opt/w3uptime
PREV_SHA=abc1234   # 7-char SHA of a previous green deploy

sed -i "s/:.*/:$PREV_SHA/" .env.images
docker compose --env-file .env --env-file .env.images \
  -f docker-compose.prod.yml pull frontend hub data-ingestion
docker compose --env-file .env --env-file .env.images \
  -f docker-compose.prod.yml up -d
```

## Secret rotation

| Secret | Rotate when |
|---|---|
| `EC2_SSH_KEY` | Anyone with access leaves, or the key is ever exposed |
| `GHCR_READ_TOKEN` | Default to every 90 days (fine-grained tokens expire) |

After rotating, replace the GitHub secret value; nothing else changes.

## Why GHCR (not ECR)?

ECR would tie us to the AWS ECS/Fargate path we explicitly rejected. GHCR is
free, no AWS IAM acrobatics, and the same images can be pulled to any cloud
later. If we ever move to ECS, swap `ghcr.io` for an ECR URI in the workflow
— the rest of the pipeline is identical.
