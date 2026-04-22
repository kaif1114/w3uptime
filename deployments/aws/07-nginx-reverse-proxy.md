# 07 — Nginx reverse proxy

The Nginx container is the single internet-exposed service. Its config lives
in `docker/nginx/nginx.conf` (tracked in git) and is bind-mounted read-only
into the container.

## Config summary

```
80  ──►  nginx  ┬── /           → frontend:8000   (Next.js UI)
                ├── /hub/*      → hub:8080        (HTTP, strips /hub/)
                ├── /ws         → hub:8080        (WebSocket upgrade, 1h idle)
                └── /healthz    → 200 "ok"
```

Source: [`/docker/nginx/nginx.conf`](../../docker/nginx/nginx.conf)

## Why these specific rules

- **`/ws` WebSocket**: validators open a long-lived socket. The upgrade
  headers and `proxy_read_timeout 3600s` stop Nginx from killing idle
  connections. The hub also sends periodic pings, so sockets won't actually
  idle — but belt & braces.
- **`/hub/` rather than reusing `/`**: the frontend is a catch-all, so the
  hub's HTTP endpoints (`/ping`, `/validators`) need their own prefix to avoid
  clashing with Next.js routes. The trailing-slash `proxy_pass` means
  `/hub/ping` → `hub:8080/ping`.
- **`/healthz`**: cheap uptime check, doesn't touch the upstream services.

## Customising

### Larger request bodies

`client_max_body_size 20m;` is already set. Bump if you see 413 errors (e.g.
very large screenshot uploads from the status-page module).

### Adding more headers for Next.js

If the Next.js app needs trusted proxy headers (it uses
`X-Forwarded-Proto` via `NEXT_PUBLIC_URL`), they're already passed through.

### Logs

Nginx logs go to stdout/stderr, so:

```bash
docker compose -f docker-compose.prod.yml logs -f nginx
```

## Reloading without restart

After editing `docker/nginx/nginx.conf`:

```bash
cd /opt/w3uptime
git pull   # or scp the new config up
docker compose -f docker-compose.prod.yml exec nginx nginx -t   # syntax check
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

`-s reload` preserves existing connections. Only fall back to
`docker compose restart nginx` if the reload fails.

## HTTPS — deferred

Nothing in this config listens on `:443` yet. When you attach a domain we add
a second `server { listen 443 ssl; ... }` block and a `:80 → :443` redirect;
Certbot edits the file in place. See [`11-domain-and-https-later.md`](./11-domain-and-https-later.md).
