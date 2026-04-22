# W3Uptime — AWS Deployment (EC2 + Docker)

End-to-end runbook for deploying W3Uptime on a single AWS EC2 instance using
Docker Compose behind Nginx. Follow the docs in order the first time; after
that, CI/CD handles redeploys automatically on push to `main`.

## TL;DR

1. Launch one `t3.medium` Ubuntu 22.04 EC2, attach an Elastic IP, open ports
   22/80/443 — [`03-ec2-launch.md`](./03-ec2-launch.md)
2. SSH in, install Docker, clone the repo to `/opt/w3uptime`, fill `.env` —
   [`04-host-bootstrap.md`](./04-host-bootstrap.md), [`05-code-deploy.md`](./05-code-deploy.md)
3. Initialize the database (migrations + hypertables + triggers) —
   [`06-database-init.md`](./06-database-init.md)
4. `docker compose -f docker-compose.prod.yml up -d` — [`08-start-services.md`](./08-start-services.md)
5. Hook up GitHub Actions for auto-deploy — [`09-cicd-github-actions.md`](./09-cicd-github-actions.md)
6. Tag a validator release so users can install the CLI —
   [`10-validator-github-release.md`](./10-validator-github-release.md)

## Architecture

```
        Internet ─► EC2 :80/:443 ─► nginx
                                       │
                     ┌─────────────────┼─────────────────┐
                     ▼                 ▼                 ▼
                  frontend            hub          data-ingestion
                  (Next.js)      (HTTP + WS)      (internal :4001)
                     │                 │                 │
                     └─┐       ┌───────┘                 │
                       ▼       ▼                         ▼
                      redis   timescaledb ◄──────────────┘

    (off-host)  Alchemy / Sepolia RPC · Slack · Mapbox · OpenAI · Gmail SMTP
    (end-users) install validator CLI from GitHub Releases, connect via wss://<host>/ws
```

See [`01-architecture.md`](./01-architecture.md) for the full component/port map and data flow.

## Index

| # | Doc | What it covers |
|---|---|---|
| 01 | [Architecture](./01-architecture.md) | Full component map, ports, what-talks-to-what |
| 02 | [Prerequisites](./02-prerequisites.md) | AWS account, CLI, keypair, region choice |
| 03 | [EC2 launch](./03-ec2-launch.md) | Instance, security group, Elastic IP |
| 04 | [Host bootstrap](./04-host-bootstrap.md) | Install Docker, set up `/opt/w3uptime`, firewall |
| 05 | [Code deploy](./05-code-deploy.md) | Clone repo, fill `.env`, env-var reference table |
| 06 | [Database init](./06-database-init.md) | Prisma migrate + setup.sql + triggers.sql |
| 07 | [Nginx reverse proxy](./07-nginx-reverse-proxy.md) | How the proxy config works, customizing |
| 08 | [Start services](./08-start-services.md) | First-time startup + verification |
| 09 | [CI/CD with GitHub Actions](./09-cicd-github-actions.md) | GHCR + SSH deploy workflow |
| 10 | [Validator release](./10-validator-github-release.md) | Tag-triggered GitHub Releases |
| 11 | [Add domain + HTTPS later](./11-domain-and-https-later.md) | Let's Encrypt once you have a domain |
| 12 | [Post-deploy verification](./12-post-deploy-verification.md) | E2E smoke test |
| 13 | [Operations](./13-operations.md) | Backups, log rotation, rollback |

## Scope

- Deploys: frontend, hub, data-ingestion, TimescaleDB, Redis, Nginx.
- Does **not** deploy: the `validator` CLI (users install locally from GitHub
  Releases — see doc 10).
- Does **not** cover: the Web3 DePIN token/mainnet layer. The governance
  contract is already deployed on Sepolia (see
  `deployments/sepolia-governance.json`).

## AWS account

Account `855386719955`, IAM user `Bachal`. Console URL and password are in
`w3uptime-knowladge/Bachal_credentials.csv` (outside the repo). **Do not
commit those credentials anywhere.**
