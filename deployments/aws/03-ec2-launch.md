# 03 — Launch the EC2 instance

One `t3.medium` Ubuntu 22.04 instance is enough to run everything. Scale up to
`t3.large` later if frontend memory is tight.

## Resources we'll create

1. A security group (`w3uptime-prod-sg`).
2. An EC2 instance (`w3uptime-prod`), 50 GB gp3 root volume.
3. An Elastic IP, associated to that instance.

## Option A — AWS CLI (fast)

```bash
export AWS_REGION=ap-south-1        # match your 02-prerequisites choice

# --- 1. Find the latest Ubuntu 22.04 AMI in this region ---
UBUNTU_AMI=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters \
    "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
    "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)
echo "Using AMI: $UBUNTU_AMI"

# --- 2. Default VPC + pick any subnet in it ---
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" \
  --query 'Vpcs[0].VpcId' --output text)
SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[0].SubnetId' --output text)

# --- 3. Security group ---
SG_ID=$(aws ec2 create-security-group \
  --group-name w3uptime-prod-sg \
  --description "W3Uptime prod: SSH from admin, HTTP/HTTPS from anywhere" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' --output text)

# Your current public IP — locks SSH down to just you.
MY_IP=$(curl -s https://checkip.amazonaws.com)/32

aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
  --protocol tcp --port 22 --cidr "$MY_IP"
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
  --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# --- 4. Launch the instance ---
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$UBUNTU_AMI" \
  --instance-type t3.medium \
  --key-name w3uptime-prod \
  --security-group-ids "$SG_ID" \
  --subnet-id "$SUBNET_ID" \
  --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=w3uptime-prod}]' \
  --query 'Instances[0].InstanceId' --output text)

echo "Instance: $INSTANCE_ID"

# Wait until it's reachable
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

# --- 5. Elastic IP ---
EIP_ALLOC=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)
aws ec2 associate-address --instance-id "$INSTANCE_ID" --allocation-id "$EIP_ALLOC"

EIP=$(aws ec2 describe-addresses --allocation-ids "$EIP_ALLOC" \
  --query 'Addresses[0].PublicIp' --output text)
PUBLIC_DNS=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].PublicDnsName' --output text)

echo ""
echo "=============================================="
echo "Public IP:  $EIP"
echo "Public DNS: $PUBLIC_DNS"
echo "SSH:        ssh -i ~/.ssh/w3uptime_ec2 ubuntu@$EIP"
echo "=============================================="
```

Save `INSTANCE_ID`, `EIP`, and the SSH command — you'll need them in every doc
below.

## Option B — AWS Console

1. EC2 → Instances → **Launch instances**.
2. Name: `w3uptime-prod`.
3. AMI: **Ubuntu Server 22.04 LTS (HVM), SSD** (x86_64).
4. Instance type: `t3.medium`.
5. Key pair: `w3uptime-prod` (imported in doc 02).
6. Network settings → **Create security group**:
   - Allow SSH from **My IP**.
   - Allow HTTP from Anywhere (0.0.0.0/0).
   - Allow HTTPS from Anywhere (0.0.0.0/0).
   - Name it `w3uptime-prod-sg`.
7. Configure storage: 50 GB, gp3.
8. **Launch instance**.
9. Once running: EC2 → Elastic IPs → Allocate → Associate to this instance.

## Sanity test

```bash
ssh -i ~/.ssh/w3uptime_ec2 ubuntu@<public-ip>
# → you should land in an Ubuntu shell.
```

If SSH hangs, double-check the SG ingress rule allows port 22 from **your
current** IP (your ISP may have rotated it).

---

Next: [`04-host-bootstrap.md`](./04-host-bootstrap.md).
