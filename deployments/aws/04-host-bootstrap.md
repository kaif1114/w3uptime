# 04 — Host bootstrap

Install Docker, prepare `/opt/w3uptime`, harden the firewall. All of this runs
on the EC2 instance via SSH.

## One-shot bootstrap script

SSH in and paste this whole block. It is idempotent — safe to re-run.

```bash
ssh -i ~/.ssh/w3uptime_ec2 ubuntu@<eip>

sudo bash <<'BOOTSTRAP'
set -euo pipefail

echo "==> System update"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "==> Base tools"
apt-get install -y ca-certificates curl gnupg lsb-release git ufw unattended-upgrades wget

echo "==> Docker engine + compose plugin (official repo)"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

usermod -aG docker ubuntu

echo "==> Firewall (UFW) — only SSH + HTTP + HTTPS"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Log rotation for docker containers (10MB × 3)"
cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
systemctl restart docker

echo "==> App directory"
mkdir -p /opt/w3uptime
chown ubuntu:ubuntu /opt/w3uptime

echo "==> Unattended security upgrades"
dpkg-reconfigure -plow unattended-upgrades

echo "==> DONE"
BOOTSTRAP
```

After this completes, **log out and back in** so your `ubuntu` user picks up
the `docker` group membership:

```bash
exit
ssh -i ~/.ssh/w3uptime_ec2 ubuntu@<eip>

# Verify
docker version
docker compose version
id -nG ubuntu | tr ' ' '\n' | grep docker
```

## Disk layout sanity check

```bash
df -h /
# / should be on a 50 GB volume (the gp3 root)

# Enable EBS growth in case you need to resize later:
sudo apt-get install -y cloud-guest-utils
```

## Timezone (optional)

```bash
sudo timedatectl set-timezone Asia/Karachi   # or your preference
```

## What we just did

- Installed Docker from the official Docker `apt` repo (not the outdated
  `docker.io` Ubuntu package).
- Locked the firewall to 22/80/443 only — matches the SG rules.
- Set a sane JSON log-driver config so `docker logs` files don't eat the disk.
- Created `/opt/w3uptime` owned by `ubuntu` (where we'll clone the repo next).

---

Next: [`05-code-deploy.md`](./05-code-deploy.md).
