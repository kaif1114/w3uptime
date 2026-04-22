# 11 — Add a domain + HTTPS (post-testing)

We intentionally launched on the EC2 public DNS over plain HTTP so early
testers can kick the tyres with zero DNS faff. Once you're ready, this doc
upgrades the same deployment to a custom domain and real TLS — no application
changes required.

## Prereqs

- You've purchased a domain (Namecheap, Cloudflare Registrar, Route 53 —
  any).
- The EC2 instance has a **stable** Elastic IP (it does, from doc 03).

## Option A — Let's Encrypt via Certbot on the EC2 (recommended)

Simplest path; keeps TLS termination on the same Nginx we already run.

### 1. Point DNS at the Elastic IP

Create two A records on your domain:

| Name | Type | Value |
|---|---|---|
| `@` (or `app`) | A | `<elastic-ip>` |
| `www` (optional) | A | `<elastic-ip>` |

Wait for propagation (minutes, usually):

```bash
dig +short app.example.com          # → your Elastic IP
```

### 2. Install Certbot on the host

```bash
ssh -i ~/.ssh/w3uptime_ec2 ubuntu@<eip>
sudo apt-get update && sudo apt-get install -y certbot
```

### 3. Issue a certificate (webroot mode)

We serve the challenge through the running Nginx container. Temporarily
mount a webroot directory:

```bash
# On the host
sudo mkdir -p /var/www/certbot
sudo chown ubuntu:ubuntu /var/www/certbot
```

Add a `location ^~ /.well-known/acme-challenge/ { root /var/www/certbot; }`
block to `docker/nginx/nginx.conf` **above** the existing `location /` and
bind-mount `/var/www/certbot` into the container. Apply the updated compose
snippet:

```yaml
# docker-compose.prod.yml (under nginx service)
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/certs:/etc/nginx/certs:ro
      - /var/www/certbot:/var/www/certbot:ro            # ← add this
```

Reload nginx:

```bash
docker compose -f docker-compose.prod.yml up -d nginx
```

Run Certbot in webroot mode:

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d app.example.com \
  --email you@example.com --agree-tos --no-eff-email
```

The issued cert lands at `/etc/letsencrypt/live/app.example.com/{fullchain,privkey}.pem`.

### 4. Wire certs into Nginx

```bash
sudo cp /etc/letsencrypt/live/app.example.com/fullchain.pem \
        /opt/w3uptime/docker/nginx/certs/fullchain.pem
sudo cp /etc/letsencrypt/live/app.example.com/privkey.pem \
        /opt/w3uptime/docker/nginx/certs/privkey.pem
sudo chown ubuntu:ubuntu /opt/w3uptime/docker/nginx/certs/*
chmod 600 /opt/w3uptime/docker/nginx/certs/privkey.pem
```

Add an HTTPS server block to `docker/nginx/nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.example.com;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Reuse the same proxy rules as the :80 block. Simplest: factor them out
    # into an include file and share between both server blocks.
    include /etc/nginx/conf.d/proxy-rules.conf;
}

# Redirect plain HTTP → HTTPS
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}
```

(Move the `/ws`, `/hub/`, `/` locations into `docker/nginx/proxy-rules.conf`
and bind-mount it next to `nginx.conf`.)

Reload:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -t
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### 5. Update app env

```bash
# /opt/w3uptime/.env
NEXT_PUBLIC_URL=https://app.example.com
SLACK_REDIRECT_URI=https://app.example.com/slack/callback
```

And in Slack app settings, update the OAuth redirect URL accordingly.

```bash
docker compose -f docker-compose.prod.yml up -d frontend
```

### 6. Auto-renew

Certbot installs a systemd timer that runs `certbot renew` twice a day. Add a
post-renew hook to copy new certs into the nginx mount:

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/w3uptime.sh <<'EOF'
#!/bin/bash
set -e
cp /etc/letsencrypt/live/app.example.com/fullchain.pem /opt/w3uptime/docker/nginx/certs/
cp /etc/letsencrypt/live/app.example.com/privkey.pem   /opt/w3uptime/docker/nginx/certs/
chown ubuntu:ubuntu /opt/w3uptime/docker/nginx/certs/*
chmod 600 /opt/w3uptime/docker/nginx/certs/privkey.pem
docker compose -f /opt/w3uptime/docker-compose.prod.yml exec -T nginx nginx -s reload
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/w3uptime.sh
```

## Option B — Cloudflare in front (easiest)

If you prefer zero TLS config on the server:

1. Move the domain's nameservers to Cloudflare.
2. Create an A record `app` → `<elastic-ip>`, **orange cloud on**.
3. SSL/TLS → set mode to **Flexible** (Cloudflare ↔ browser HTTPS, Cloudflare
   ↔ origin HTTP — which is what we already run).
4. Update `NEXT_PUBLIC_URL=https://app.example.com`.

No nginx changes. Downside: Cloudflare sees all traffic in plaintext toward
the origin — acceptable for an MVP, not for handling sensitive data.

## Post-migration checklist

- [ ] `curl -sI https://app.example.com/healthz` → 200
- [ ] `wscat -c wss://app.example.com/ws` → connects
- [ ] MetaMask sign-in from the browser works
- [ ] Validator CLI updated to `wss://` URL:
      `w3uptime-validator config set hub.url wss://app.example.com/ws`
