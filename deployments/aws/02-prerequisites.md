# 02 — Prerequisites

Before touching AWS, have the following ready on your local machine.

## 1. AWS account access

- Console URL: `https://855386719955.signin.aws.amazon.com/console`
- IAM user: `Bachal`
- Password: in `w3uptime-knowladge/Bachal_credentials.csv` (off-repo)

> **Never** paste the password into a doc, commit, or terminal history.
> **Never** commit `Bachal_credentials.csv`.

Enable MFA on the IAM user if you haven't already.

## 2. AWS CLI (optional but recommended)

```bash
# macOS
brew install awscli
# Ubuntu / WSL
sudo apt install awscli

aws configure
# AWS Access Key ID:       <create one in IAM → Users → Bachal → Security credentials>
# AWS Secret Access Key:   <paste>
# Default region:          ap-south-1     # or us-east-1
# Default output format:   json

aws sts get-caller-identity   # sanity check — should return account 855386719955
```

If you prefer to do everything in the AWS web console, that is fine — every
runbook below includes console steps too.

## 3. Region

Pick **one** region and stick with it. Recommended: `ap-south-1` (Mumbai) if
you/the team is in South Asia; otherwise `us-east-1` (cheapest, most services).

All later commands assume the region is set as default in `~/.aws/config` or
passed via `--region`.

## 4. SSH keypair

Generate a new keypair specifically for this EC2 instance. Do not reuse your
personal GitHub SSH key.

```bash
# Local machine
ssh-keygen -t ed25519 -f ~/.ssh/w3uptime_ec2 -C "w3uptime-prod"
# → ~/.ssh/w3uptime_ec2       (private, NEVER upload)
# → ~/.ssh/w3uptime_ec2.pub   (public, goes into AWS)
```

Import the public half into AWS so we can attach it at launch:

```bash
aws ec2 import-key-pair \
  --key-name w3uptime-prod \
  --public-key-material "fileb://$HOME/.ssh/w3uptime_ec2.pub"
```

(Or: EC2 console → Network & Security → Key Pairs → Import → paste the `.pub`.)

## 5. Domain (optional, defer for now)

We are launching with only the EC2 public DNS. Don't buy a domain yet. When
you're ready (after early testing), see `11-domain-and-https-later.md`.

## 6. GitHub repository

The deployment workflow pushes images to GitHub Container Registry (GHCR) on
every push to `main`. Make sure:

- The repo is on GitHub (public or private).
- You have `admin` on it (to add Actions secrets later).

## 7. Local tools for verification

```bash
# Optional but useful after deploy:
brew install wscat            # WebSocket smoke test
brew install jq               # JSON pretty-printing
```

---

Once all seven items are in place, proceed to [`03-ec2-launch.md`](./03-ec2-launch.md).
