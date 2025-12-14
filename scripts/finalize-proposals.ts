import { prisma } from 'db/client';
import { Wallet, JsonRpcProvider } from 'ethers';
import { createGovernanceContractWithSigner } from 'common/governance-contract';

const AUTHORIZED_SIGNER_KEY = process.env.AUTHORIZED_SIGNER_KEY!;
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL!;
const MIN_QUORUM = 0.5; // 50%

async function finalizeEligibleProposals() {
  console.log('Starting finalization check...');

  // Find proposals eligible for finalization
  const eligibleProposals = await prisma.proposal.findMany({
    where: {
      onChainStatus: 'ACTIVE',
      votingEndsAt: {
        lte: new Date() // Voting period ended
      }
    }
  });

  console.log(`Found ${eligibleProposals.length} proposals ready for finalization`);

  for (const proposal of eligibleProposals) {
    try {
      console.log(`Processing proposal ${proposal.id} (on-chain ID: ${proposal.onChainId})...`);

      // Connect to contract and fetch on-chain vote data
      const provider = new JsonRpcProvider(ETHEREUM_RPC_URL);
      const wallet = new Wallet(AUTHORIZED_SIGNER_KEY, provider);
      const contract = createGovernanceContractWithSigner(wallet);

      // Get current vote counts from contract
      const onChainProposal = await contract.getProposal(BigInt(proposal.onChainId!));
      const upvoteCount = Number(onChainProposal.upvotes);
      const downvoteCount = Number(onChainProposal.downvotes);
      const totalVotes = upvoteCount + downvoteCount;

      console.log(`  Votes: ${upvoteCount} up, ${downvoteCount} down, ${totalVotes} total`);

      // Check quorum (votes are already on-chain, just verify count)
      const totalUsers = await prisma.user.count();
      const participationRate = totalVotes / totalUsers;

      if (participationRate < MIN_QUORUM) {
        console.log(`  ❌ Quorum not met: ${(participationRate * 100).toFixed(2)}% (need ${MIN_QUORUM * 100}%)`);
        // Mark as FAILED due to quorum
        await prisma.proposal.update({
          where: { id: proposal.id },
          data: {
            onChainStatus: 'FAILED',
            status: 'REJECTED'
          }
        });
        continue;
      }

      console.log(`  ✓ Quorum met: ${(participationRate * 100).toFixed(2)}%`);

      // Update status to pending
      await prisma.proposal.update({
        where: { id: proposal.id },
        data: { onChainStatus: 'PENDING_ONCHAIN' }
      });

      console.log(`  Submitting finalization transaction...`);

      // Call finalizeProposal on contract (simple call, no vote data needed)
      const tx = await contract.finalizeProposal(
        BigInt(proposal.onChainId!),
        { gasLimit: 200000 }
      );

      console.log(`  Transaction submitted: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`  ✓ Transaction confirmed in block ${receipt?.blockNumber}`);

      // Parse event to get result
      const event = receipt?.logs.find(log => {
        try {
          return contract.interface.parseLog(log)?.name === 'ProposalFinalized';
        } catch { return false; }
      });

      const passed = event ? contract.interface.parseLog(event)!.args.passed : false;

      // Update database (listener will also update, but we do it here for immediate feedback)
      await prisma.proposal.update({
        where: { id: proposal.id },
        data: {
          finalizationTxHash: receipt?.hash,
          onChainStatus: passed ? 'PASSED' : 'FAILED',
          status: passed ? 'APPROVED' : 'REJECTED'
        }
      });

      console.log(`  ✓ Proposal finalized: ${passed ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
      console.error(`  ❌ Error finalizing proposal ${proposal.id}:`, error);
      // Send alert to admin (email, Slack, etc.)
      // Don't throw - continue with next proposal
    }
  }

  console.log('Finalization check complete.');
}

// Run immediately
finalizeEligibleProposals()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
