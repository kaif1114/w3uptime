/**
 * VoteCache Event Listener Service
 *
 * Monitors blockchain for VoteCast events from W3Governance contract
 * and synchronizes vote data to the VoteCache database table.
 *
 * Features:
 * - Block polling (no filter expiration)
 * - Automatic cache synchronization with blockchain state
 * - Idempotent event processing (handles duplicates safely)
 * - Processes past events on startup
 * - Exponential backoff reconnection on failures
 * - Vote change handling (user votes again with different support)
 *
 * Usage:
 * ```typescript
 * import { startVoteCacheListener } from './services/vote-cache-listener';
 *
 * // Start listening in server initialization
 * await startVoteCacheListener();
 * ```
 */

import { ethers } from 'ethers';
import { createGovernanceContract, GOVERNANCE_CONTRACT_ADDRESS, type W3GovernanceContract } from 'common/governance-contract';
import { prisma } from 'db/client';
import { VoteType } from '@prisma/client';
import { BaseBlockListener } from './BaseBlockListener';

/**
 * VoteCacheListener class
 * Follows the same pattern as BlockchainListener for consistency
 */
class VoteCacheListener extends BaseBlockListener<W3GovernanceContract> {
  getListenerName(): string {
    return "vote";
  }

  createContract(provider: ethers.Provider): W3GovernanceContract {
    return createGovernanceContract(provider);
  }

  getEventFilters(): (ethers.DeferredTopicFilter | ethers.EventFilter)[] {
    if (!this.contract) return [];
    return [this.contract.filters.VoteCast()];
  }

  async processEvent(event: ethers.Log): Promise<void> {
    await this.processVoteCastEvent(event, undefined);
  }

  /**
   * Process a VoteCast event and update VoteCache
   *
   * VoteCast event signature: VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 timestamp)
   *
   * @param event - The event log
   * @param precomputedArgs - Pre-parsed event arguments (if available)
   */
  private async processVoteCastEvent(event: ethers.Log, precomputedArgs?: unknown[]) {
    try {
      if (!this.contract) return;

      // Verify event is from our contract
      if (event.address.toLowerCase() !== GOVERNANCE_CONTRACT_ADDRESS.toLowerCase()) {
        // Silently skip events from other contracts
        return;
      }

      // Parse event if args not provided
      let parsedEvent;
      if (precomputedArgs) {
        parsedEvent = { args: precomputedArgs, name: 'VoteCast' };
      } else {
        try {
          parsedEvent = this.contract.interface.parseLog({
            topics: event.topics,
            data: event.data || '0x',
          });
        } catch (parseError) {
          // Silently skip events that don't match VoteCast signature
          // This can happen if queryFilter returns logs from other events
          return;
        }
      }

      // Verify this is actually a VoteCast event
      if (!parsedEvent || parsedEvent.name !== 'VoteCast' || !parsedEvent.args) {
        // Silently skip non-VoteCast events
        return;
      }

      // Extract event data
      const proposalId = parsedEvent.args[0] as bigint;
      const voterAddress = (parsedEvent.args[1] as string).toLowerCase();
      const support = parsedEvent.args[2] as boolean;

      console.log(`[VoteCacheListener] Processing vote:`, {
        proposalId: proposalId.toString(),
        voterAddress,
        support,
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
      });

      // Check if this transaction hash already processed (idempotency)
      const existingByTxHash = await prisma.voteCache.findUnique({
        where: { txHash: event.transactionHash },
      });

      if (existingByTxHash) {
        console.log(
          `[VoteCacheListener] Vote already processed (txHash: ${event.transactionHash})`
        );
        return;
      }

      // Find the proposal by onChainId
      const proposal = await prisma.proposal.findFirst({
        where: { onChainId: Number(proposalId) },
      });

      if (!proposal) {
        console.error(
          `[VoteCacheListener] Proposal with onChainId ${proposalId} not found in database`
        );
        return;
      }

      // Upsert vote cache using unique constraint [proposalId, voterAddress]
      // This handles both new votes and vote changes
      const voteCache = await prisma.voteCache.upsert({
        where: {
          proposalId_voterAddress: {
            proposalId: proposal.id,
            voterAddress,
          },
        },
        create: {
          proposalId: proposal.id,
          onChainProposalId: Number(proposalId),
          voterAddress,
          voteType: support ? VoteType.UPVOTE : VoteType.DOWNVOTE,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
        },
        update: {
          voteType: support ? VoteType.UPVOTE : VoteType.DOWNVOTE,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          // createdAt stays the same (first vote timestamp)
          // updatedAt will be updated automatically by Prisma
        },
      });

      console.log(
        `[VoteCacheListener] Vote cached successfully:`,
        {
          id: voteCache.id,
          proposalId: voteCache.proposalId,
          voter: voteCache.voterAddress,
          voteType: voteCache.voteType,
        }
      );
    } catch (error) {
      console.error('[VoteCacheListener] Error processing VoteCast event:', error);
      // Don't throw - continue processing other events
    }
  }

  getStatus() {
    return {
      ...super.getStatus(),
      contractAddress: GOVERNANCE_CONTRACT_ADDRESS
    };
  }
}

// Singleton instance
let listenerInstance: VoteCacheListener | null = null;

/**
 * Get the singleton VoteCacheListener instance
 */
export function getVoteCacheListener(): VoteCacheListener {
  if (!listenerInstance) {
    listenerInstance = new VoteCacheListener();
  }
  return listenerInstance;
}

/**
 * Start the VoteCache listener service
 * Safe to call multiple times - will not start duplicate listeners
 */
export async function startVoteCacheListener(): Promise<void> {
  const listener = getVoteCacheListener();
  await listener.start();
}

/**
 * Stop the VoteCache listener service
 */
export async function stopVoteCacheListener(): Promise<void> {
  const listener = getVoteCacheListener();
  await listener.stop();
}
