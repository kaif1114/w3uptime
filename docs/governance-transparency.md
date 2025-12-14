# On-Chain Governance Transparency

## Overview

W3Uptime uses blockchain technology to ensure transparent, verifiable governance. All proposals and votes are recorded directly on the Sepolia Ethereum testnet using a direct on-chain voting model.

## Voting Model: Direct On-Chain

Unlike gasless signature-based systems, W3Uptime uses **direct on-chain voting** where:
- Each vote is a blockchain transaction
- Voters pay their own gas fees (~$0.50-1.00)
- Votes are immediately visible on-chain
- No batch submission or signature aggregation needed
- Full transparency and real-time verification

---

## For Users

### Creating an On-Chain Proposal

1. Navigate to Community > Submit Proposal
2. Fill in title, description, type, and tags
3. Check "Create on-chain proposal"
4. Click Submit - MetaMask will prompt for transaction signature
5. Pay gas fee (estimated: ~$0.50 on Sepolia)
6. Wait for confirmation (~15 seconds)
7. Proposal is now verifiable on Etherscan

### Voting on Proposals

1. Open any active on-chain proposal
2. Click "Upvote On-Chain" or "Downvote On-Chain"
3. Review gas estimate in confirmation dialog
4. Confirm in MetaMask and pay gas fee (~$0.50-1.00)
5. Your vote is recorded immediately on blockchain
6. View your vote transaction on Etherscan
7. **Note**: Vote changes are NOT allowed after submission

### Verifying Your Vote

1. After voting, your vote is immediately visible on-chain
2. Click "Verify My Vote" on proposal page
3. System fetches your vote directly from blockchain
4. View your VoteCast transaction on Etherscan
5. Verify vote timestamp and block number

### Understanding Governance Rules

- **Voting Period**: 7 days from proposal creation
- **Passing Threshold**: 2/3 (66.67%) of votes must be upvotes
- **Finalization**: Automatic within 24 hours after voting ends
- **Vote Changes**: NOT allowed (each address can vote once)
- **Gas Costs**: Users pay gas for votes, platform pays for finalization

---

## For Developers

### Smart Contract Details

- **Network**: Sepolia Testnet (Chain ID: 11155111)
- **Contract Address**: See `.env.example` for `NEXT_PUBLIC_GOVERNANCE_CONTRACT_ADDRESS`
- **Verified Source**: https://sepolia.etherscan.io/address/[CONTRACT_ADDRESS]
- **Voting Model**: Direct on-chain (no EIP-712 signatures)

### Architecture

```
User → MetaMask → Smart Contract (vote tx) → Blockchain
                     ↓
              VoteCast Event
                     ↓
           Event Listener → Database (cache)
```

### Key Technologies

- **Direct On-Chain Voting**: Each vote is a blockchain transaction
- **ethers.js v6**: Blockchain interaction library
- **Sepolia**: Ethereum testnet
- **Prisma ORM**: Database management (vote caching)
- **Next.js 15**: Frontend and API routes

### API Endpoints

- `POST /api/proposals` - Create proposal (on-chain or off-chain)
- `GET /api/proposals/[id]/vote-info` - Get voting information
- `GET /api/proposals/[id]/verify-vote` - Verify vote on-chain
- `GET /api/proposals/dashboard` - Transparency dashboard data
- `GET /api/proposals/export` - Export governance data
- `POST /api/admin/governance/finalize-now` - Manual finalization (admin only)

### Database Schema

**Extended Proposal Model:**
```prisma
model Proposal {
  // Existing fields...

  // On-chain tracking fields
  onChainId           Int?              @unique
  contentHash         String?
  creationTxHash      String?           @unique
  finalizationTxHash  String?           @unique
  votingEndsAt        DateTime?
  onChainStatus       OnChainStatus     @default(DRAFT)

  // Relations
  voteCaches          VoteCache[]
}
```

**VoteCache Model (for caching on-chain votes):**
```prisma
model VoteCache {
  id                  String    @id @default(uuid())
  proposalId          String
  onChainProposalId   Int
  voterAddress        String
  voteType            VoteType
  txHash              String    @unique
  blockNumber         Int
  createdAt           DateTime  @default(now())

  @@unique([proposalId, voterAddress])
}
```

### Smart Contract Functions

```solidity
// Create a new proposal
function createProposal(bytes32 contentHash, uint256 votingDuration) external returns (uint256)

// Vote on a proposal (user pays gas)
function vote(uint256 proposalId, bool support) external

// Get vote status for an address
function getVote(uint256 proposalId, address voter) external view returns (bool hasVoted, bool support)

// Finalize a proposal after voting ends
function finalizeProposal(uint256 proposalId) external

// Get proposal details
function getProposal(uint256 proposalId) external view returns (Proposal)
```

### Running Finalization Scheduler

```bash
# Manual run
npm run finalize-proposals

# Setup cron (Linux/Mac)
crontab -e
*/15 * * * * cd /path/to/w3uptime && npm run finalize-proposals >> logs/finalization.log 2>&1
```

### Testing

```bash
# Smart contract tests (Remix IDE or Hardhat)
cd contracts && npx hardhat test

# Integration tests
npm run test:integration
```

---

## For Platform Admins

### Admin Dashboard

Access the admin dashboard at `/admin/governance` to:
- View pending finalizations
- Monitor finalization success rate
- Manually trigger finalization for stuck proposals
- View error alerts
- Monitor platform wallet balance

### Manual Finalization

If a proposal fails to finalize automatically:
1. Go to Admin Dashboard
2. Find the proposal in "Error Alerts"
3. Click "Finalize Now"
4. Confirm transaction in MetaMask
5. Wait for confirmation
6. Verify on Etherscan

### Platform Wallet Management

The platform wallet is used to pay gas for finalization transactions. Ensure:
- Wallet has sufficient Sepolia ETH (minimum 0.1 ETH recommended)
- Private key is stored securely in environment variables
- Monitor balance regularly
- Get test ETH from: https://sepoliafaucet.com

---

## Troubleshooting

### "Please switch to Sepolia network"

1. Open MetaMask
2. Click network dropdown
3. Select "Sepolia" (or add if not listed)

### "Insufficient funds for gas"

- Get Sepolia ETH from faucet: https://sepoliafaucet.com
- Needed for both creating proposals AND voting

### "Transaction would fail"

- Check voting period hasn't ended
- Verify proposal is in ACTIVE status
- Ensure you haven't already voted
- Try refreshing page

### "Already voted"

- Direct on-chain voting does NOT support vote changes
- Each address can only vote once per proposal
- This ensures vote integrity and prevents manipulation

### Vote not showing as verified

- Votes are verified immediately via `contract.getVote()`
- Check you're connected with the wallet you voted from
- Verify transaction confirmed on Etherscan
- Contact support if issue persists

---

## Security Considerations

### For Users

- Never share your private key
- Verify contract address before signing
- Only sign transactions you understand
- Use hardware wallet for large holdings
- Be aware votes are permanent (cannot change)

### For Platform

- Platform wallet private key stored in encrypted `.env`
- Regular security audits of smart contracts
- Rate limiting on API endpoints
- Monitoring for unusual activity
- Only platform pays finalization gas, users pay vote gas

---

## Comparison: Direct vs Gasless Voting

| Feature | Direct On-Chain | Gasless (EIP-712) |
|---------|----------------|-------------------|
| User Gas Cost | ~$0.50-1.00 per vote | $0 (free) |
| Vote Visibility | Immediate | After batch submission |
| Vote Changes | Not allowed | Allowed until finalization |
| Complexity | Simple | Signature aggregation |
| Trust Model | Trustless | Trust platform for batch |
| Verification | Real-time | After finalization |

**W3Uptime uses Direct On-Chain for maximum transparency.**

---

## Environment Variables

Required environment variables:

```bash
# Contract Configuration
NEXT_PUBLIC_GOVERNANCE_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=11155111

# RPC Provider
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Platform Signer (for finalization)
PLATFORM_SIGNER_PRIVATE_KEY=0x...

# Alchemy API Key (optional, for enhanced RPC features)
ALCHEMY_API_KEY=your_alchemy_key
```

---

## Future Enhancements

- Mainnet deployment
- Delegation support
- Proposal deposit requirements
- Timelocked execution
- Multi-signature admin controls
- L2 deployment for lower gas costs
- Reputation-based voting weight

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/w3uptime/w3uptime/issues
- Documentation: https://docs.w3uptime.com
- Email: support@w3uptime.com

---

**Last Updated**: December 2025
**Version**: 2.0 (Direct On-Chain Voting)
