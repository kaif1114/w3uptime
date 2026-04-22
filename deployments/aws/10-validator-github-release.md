# 10 — Validator release via GitHub Releases

The validator is a CLI end-users install on their own machines. We don't
publish it to the npm public registry (no npm org needed) — instead, every
tagged release publishes a tarball on GitHub Releases.

Workflow: [`.github/workflows/validator-release.yml`](../../.github/workflows/validator-release.yml)
Source: [`apps/validator/`](../../apps/validator/)

## One-time package hygiene (already done)

Changes we made in `apps/validator/package.json`:

- `name`: `w3uptime-validator` (the previous name `validator` collided with a
  long-standing package on npm, and would also be confusing as a global CLI).
- `files`: `["build", "README.md"]` — so `npm pack` ships only what the CLI
  needs, not the full source + node_modules.
- `publishConfig.access`: `public` — lets `npm publish` succeed without extra
  flags *if* we ever decide to push it to npm too.

## Cutting a release

```bash
# Bump the version
cd apps/validator
npm version patch    # or minor / major
# → creates an annotated git tag like v1.0.1

# Re-tag with the validator- prefix so the workflow picks it up
git tag validator-v1.0.1
git push origin validator-v1.0.1
```

GitHub Actions runs:

1. `npm ci` at the repo root (all workspaces).
2. `npm run build --workspace=common`, then `--workspace=validator`.
3. `npm pack` in `apps/validator`, producing
   `w3uptime-validator-1.0.1.tgz`.
4. Creates a GitHub Release tagged `validator-v1.0.1`, attaches the tarball
   and a `.sha256` file, and generates the install snippet in the release
   notes.

## End-user install

Inside the release body, users see:

```bash
npm i -g https://github.com/<org>/w3uptime/releases/download/validator-v1.0.1/w3uptime-validator-1.0.1.tgz
```

Then:

```bash
# First-time setup
w3uptime-validator init --private-key 0xYOUR_EXISTING_WALLET_PK --wallet-name me
w3uptime-validator config set hub.url ws://<your-ec2-public-dns>/ws

# Run the validator
w3uptime-validator start
```

`w3uptime-validator` is registered via the `bin` field in `package.json`; a
global npm install symlinks it to the user's PATH.

## Cross-platform notes

- Windows (PowerShell + Node 20) — same `npm i -g …` command works.
- Linux/macOS — same.
- Node 18 is the documented minimum; Node 20+ is what the build and users
  should use.

## Manual dispatch

Need to re-cut a release without bumping the version? GitHub → Actions →
**Validator release** → **Run workflow**, pass the tag name. The workflow
will overwrite the existing release assets (via `softprops/action-gh-release`
default behaviour).

## Verifying a release

```bash
# On any machine with Node 20:
npm i -g https://github.com/<org>/w3uptime/releases/download/validator-v1.0.1/w3uptime-validator-1.0.1.tgz
w3uptime-validator --version        # → 1.0.1
w3uptime-validator status
```

## Security notes that must be in your release notes

Copy this into every release if you edit the body manually:

- The validator runs with your private key decrypted in memory. Run it only
  on machines you trust.
- Use `--paranoid` mode to require a password for each signing operation.
- SHA-256 of the tarball is attached — verify it matches before installing:
  `sha256sum -c w3uptime-validator-1.0.1.tgz.sha256`.

## Why not `npm publish` to the public registry?

Purely to avoid npm-account/org bureaucracy. Nothing in the code requires
GitHub Releases — if you later want to publish to npm too, `publishConfig`
is already set; add a `npm publish` step to the workflow (needs an
`NPM_TOKEN` secret).
