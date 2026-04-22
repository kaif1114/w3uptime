#!/bin/sh
set -e

WALLET_NAME="demo-validator"
KEYSTORE_FILE="${HOME}/.w3uptime/keystore/${WALLET_NAME}.json"

if [ -z "${W3UPTIME_PRIVATE_KEY}" ]; then
  echo "ERROR: W3UPTIME_PRIVATE_KEY env var is required" >&2
  exit 1
fi

if [ -z "${W3UPTIME_WALLET_PASSWORD}" ]; then
  echo "ERROR: W3UPTIME_WALLET_PASSWORD env var is required" >&2
  exit 1
fi

if [ ! -f "${KEYSTORE_FILE}" ]; then
  echo "==> First run: initializing validator wallet..."
  node /app/apps/validator/build/main.js init \
    --private-key "${W3UPTIME_PRIVATE_KEY}" \
    --wallet-name "${WALLET_NAME}" \
    --hub-url "ws://hub:8080"
  echo "==> Wallet initialized"
fi

echo "==> Starting validator..."
exec node /app/apps/validator/build/main.js start --wallet "${WALLET_NAME}"
