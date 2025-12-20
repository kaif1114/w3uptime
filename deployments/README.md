# Contract Deployments

This directory contains deployment artifacts for W3Uptime smart contracts.

## Sepolia Testnet

### W3Governance Contract

**Deployment Instructions**:

1. **Open Remix IDE**: Navigate to https://remix.ethereum.org

2. **Import Contract**:
   - Create new file: `W3Governance.sol`
   - Copy contents from `contracts/W3Governance.sol`
   - The contract should automatically compile

3. **Configure Compiler**:
   - Go to "Solidity Compiler" tab
   - Select compiler version: `0.8.20` or higher
   - Enable optimization: 200 runs (recommended)
   - Click "Compile W3Governance.sol"
   - Verify no errors

4. **Connect MetaMask**:
   - Install MetaMask browser extension if not installed
   - Switch network to **Sepolia Testnet**
   - Ensure you have Sepolia ETH (minimum 0.05 ETH recommended)
   - Get test ETH from faucet if needed: https://sepoliafaucet.com

5. **Deploy Contract**:
   - Go to "Deploy & Run Transactions" tab
   - Environment: Select "Injected Provider - MetaMask"
   - Verify account and network shown in Remix match MetaMask
   - Contract: Select "W3Governance"
   - No constructor parameters needed
   - Click "Deploy" button
   - Confirm transaction in MetaMask popup
   - Wait for 2 block confirmations (~30 seconds)

6. **Record Deployment Info**:
   - Copy the deployed contract address from Remix console
   - Copy transaction hash from Remix console
   - Note the block number
   - Update `deployments/sepolia-governance.json` with this information

7. **Verify Contract on Etherscan**:
   - Go to https://sepolia.etherscan.io/address/[YOUR_CONTRACT_ADDRESS]
   - Click "Contract" tab → "Verify and Publish"
   - Verification Type: "Solidity (Single File)"
   - Compiler Type: Solidity
   - Compiler Version: v0.8.20 (match your compilation version)
   - Open Source License Type: MIT
   - Paste the contract source code (W3Governance.sol)
   - If optimization was enabled: Check "Optimization" and set runs to 200
   - Click "Verify and Publish"
   - Wait for verification (~1 minute)

8. **Extract ABI**:
   - In Remix, go to "Solidity Compiler" tab
   - Under "Compilation Details", click "ABI" button
   - Copy the ABI JSON
   - Save to `packages/common/governance-abi.json`

9. **Update Environment Variables**:
   - Add to `.env`: `NEXT_PUBLIC_GOVERNANCE_CONTRACT_ADDRESS=0x...`
   - Add to `.env.example`: `NEXT_PUBLIC_GOVERNANCE_CONTRACT_ADDRESS=`

10. **Test Deployment**:
    - In Remix, under "Deployed Contracts" section
    - Test `proposalCount()` - should return 0
    - Test `MIN_VOTING_DURATION()` - should return 86400 (1 day in seconds)
    - Test `MAX_VOTING_DURATION()` - should return 2592000 (30 days in seconds)

**After deployment, fill in the details in `sepolia-governance.json`**

---

## Deployment Checklist

- [ ] Contract compiled successfully in Remix
- [ ] MetaMask connected to Sepolia
- [ ] Sufficient Sepolia ETH for gas
- [ ] Contract deployed successfully
- [ ] Transaction confirmed (2+ blocks)
- [ ] Contract address recorded
- [ ] Source code verified on Etherscan
- [ ] ABI extracted and saved
- [ ] Environment variables updated
- [ ] Basic contract functions tested
