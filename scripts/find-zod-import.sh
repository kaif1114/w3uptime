#!/usr/bin/env bash
# find which module imports zod/v4/core inside node_modules
echo '=== matches in frontend/node_modules ==='
sudo grep -rl --include='*.js' --include='*.mjs' --include='*.cjs' 'zod/v4/core' \
  /opt/w3uptime/apps/frontend/node_modules/ 2>/dev/null | head -30
echo
echo '=== matches in root node_modules ==='
sudo grep -rl --include='*.js' --include='*.mjs' --include='*.cjs' 'zod/v4/core' \
  /opt/w3uptime/node_modules/ 2>/dev/null | head -30
