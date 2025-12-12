# Platform Wallet Setup Guide

This guide explains how to set up and manage the platform wallet used for finalizing governance proposals.

## Overview

The platform wallet is used to pay gas fees for automatically finalizing proposals when their voting period ends. Users do NOT pay gas for finalization - the platform covers these costs.

## Initial Setup

### 1. Generate Platform Wallet

Run the following script to generate a new wallet:

```bash
npm run generate-wallet
```

Or use Node.js directly:

```javascript
const { Wallet } = require('ethers');

// Generate new random wallet
const wallet = Wallet.createRandom();

console.log('Platform Wallet Generated:');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('Mnemonic:', wallet.mnemonic.phrase);

// IMPORTANT: Save the mnemonic in a secure location!
// Store private key in .env file for operational use
```

### 2. Configure Environment Variables

Add the following to your `.env` file (NEVER commit this file to git):

```bash
# Platform Wallet Configuration
PLATFORM_SIGNER_PRIVATE_KEY=0x...  # Private key from step 1
PLATFORM_SIGNER_ADDRESS=0x...      # Wallet address from step 1
```

### 3. Fund the Wallet

For **Sepolia Testnet**:
- Visit https://sepoliafaucet.com/
- Enter the platform wallet address
- Request at least 0.5 ETH
- Wait for confirmation

For **Production (Ethereum Mainnet)**:
- Transfer ETH from your organization's main wallet
- Recommended starting balance: 5 ETH
- Set up automatic top-ups when balance drops below 1 ETH

### 4. Verify Setup

Check wallet balance:

```bash
npm run check-wallet-balance
```

Expected output:
```
Checking platform wallet balance...
Wallet Address: 0x...
Platform wallet balance: 0.500000 ETH
✓ Wallet balance is sufficient
Total transactions: 0
```

## Monitoring

### Daily Balance Check

Add to cron (Linux/Mac) or Task Scheduler (Windows):

```bash
# Check balance every day at 9 AM
0 9 * * * cd /path/to/w3uptime && npm run check-wallet-balance >> logs/wallet-balance.log 2>&1
```

### Low Balance Alerts

The balance check script will exit with code 1 if balance is below 0.1 ETH. Configure your monitoring system to alert on this.

### Transaction Monitoring

All finalization transactions are logged in `logs/finalization.log`. Review this file regularly to:
- Verify successful finalization transactions
- Identify any failed transactions
- Monitor gas spending patterns

## Security Measures

### ✅ Implemented

1. **Private Key Storage**: Stored in `.env` file, never committed to git
2. **Restricted Access**: `.env` file has restricted file permissions
3. **Environment Separation**: Different wallets for staging and production
4. **Balance Monitoring**: Automated daily balance checks with alerts

### 🔒 Recommended for Production

1. **Hardware Security Module (HSM)**: Store private key in hardware device
2. **AWS KMS**: Use AWS Key Management Service for key encryption
3. **HashiCorp Vault**: Centralized secrets management
4. **Multi-signature Wallet**: Require multiple approvals for large transactions
5. **Key Rotation**: Rotate wallet every 90 days
6. **2FA**: Enable two-factor authentication on all cloud services
7. **Access Logs**: Enable and monitor access logs for private key retrieval
8. **Spending Limits**: Set up transaction amount limits
9. **Anomaly Detection**: Alert on unusual spending patterns

## Wallet Maintenance

### Funding the Wallet

When balance drops below threshold:

1. Check current balance: `npm run check-wallet-balance`
2. Transfer ETH to the platform wallet address
3. Verify receipt: `npm run check-wallet-balance`
4. Update monitoring alerts

### Key Rotation (Every 90 Days)

1. Generate new wallet (see Initial Setup)
2. Update environment variables with new private key
3. Transfer remaining balance from old wallet to new wallet
4. Test finalization with new wallet
5. Archive old wallet private key securely
6. Update documentation with new wallet address

### Emergency Procedures

**If Private Key is Compromised:**

1. Immediately generate new wallet
2. Transfer all funds from compromised wallet to new wallet
3. Update environment variables
4. Restart all services using the platform wallet
5. Review all recent transactions for suspicious activity
6. Document incident in security log

**If Wallet Runs Out of Gas:**

1. Proposals cannot be finalized automatically
2. Fund wallet immediately (see Funding section)
3. Manually run finalization script: `npm run finalize-proposals`
4. Investigate why automated monitoring failed
5. Adjust balance thresholds if needed

## Wallet Address

**Current Platform Wallet** (Sepolia Testnet):
- Address: [To be added after setup]
- View on Etherscan: https://sepolia.etherscan.io/address/[ADDRESS]

**Production Wallet** (Ethereum Mainnet):
- Address: [To be configured for production]
- View on Etherscan: https://etherscan.io/address/[ADDRESS]

## Gas Cost Estimates

**Finalization Transaction:**
- Gas Limit: ~200,000 gas
- Average Gas Price (Sepolia): ~1-5 gwei
- Cost per finalization: ~0.0002 - 0.001 ETH

**Monthly Estimates:**
- 10 proposals/month: ~0.01 ETH
- 50 proposals/month: ~0.05 ETH
- 100 proposals/month: ~0.1 ETH

**Recommended Balance:**
- Minimum: 0.1 ETH
- Recommended: 0.5 ETH
- Production: 5 ETH

## Troubleshooting

### "Insufficient funds for gas" Error

**Cause**: Wallet balance too low
**Solution**: Fund wallet with more ETH

### "Nonce too low" Error

**Cause**: Transaction already mined or nonce conflict
**Solution**: Wait 1 minute and retry. If persists, restart the application.

### "Transaction reverted" Error

**Cause**: Smart contract rejected the transaction
**Solution**: Check proposal status. May already be finalized.

### Balance Check Fails

**Cause**: RPC endpoint down or misconfigured
**Solution**:
1. Verify `ETHEREUM_RPC_URL` in `.env`
2. Test RPC endpoint manually
3. Consider using backup RPC endpoint

## Support

For wallet-related issues:
1. Check this documentation first
2. Review logs in `logs/finalization.log` and `logs/wallet-balance.log`
3. Contact platform administrator
4. For security incidents, follow emergency procedures above
