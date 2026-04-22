#!/usr/bin/env bash
# One-shot bootstrap for the w3uptime-prod EC2 host.
# Safe to re-run. Mirrors deployments/aws/04-host-bootstrap.md.
set -euo pipefail

echo "==> System update"
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -y
sudo apt-get -o Dpkg::Options::="--force-confnew" upgrade -y

echo "==> Base tools"
sudo apt-get install -y ca-certificates curl gnupg lsb-release git ufw unattended-upgrades wget

echo "==> Docker engine + compose plugin (official repo)"
sudo install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
fi
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker ubuntu

echo "==> UFW firewall (22/80/443)"
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "==> Docker log rotation"
sudo tee /etc/docker/daemon.json >/dev/null <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
sudo systemctl restart docker

echo "==> App directory"
sudo mkdir -p /opt/w3uptime
sudo chown ubuntu:ubuntu /opt/w3uptime

echo "==> Done — versions:"
docker --version
docker compose version
echo "(re-login needed for docker group membership)"
