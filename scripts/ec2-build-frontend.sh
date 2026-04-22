#!/usr/bin/env bash
# Run on the EC2 host. Rebuilds just the frontend image in the background,
# logs to /tmp/fbuild.log, and detaches.
set -u
cd /opt/w3uptime
nohup sg docker -c 'docker build -f apps/frontend/dockerfile -t w3uptime-frontend:latest .' \
  > /tmp/fbuild.log 2>&1 < /dev/null &
disown
echo "pid=$!"
