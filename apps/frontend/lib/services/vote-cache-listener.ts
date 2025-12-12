/**
 * VoteCache Event Listener Service
 *
 * Monitors blockchain for VoteCast events from W3Governance contract
 * and synchronizes vote data to the VoteCache database table.
 *
 * Features:
 * - Real-time event listening for VoteCast events
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
import { createGovernanceContract, GOVERNANCE_CONTRACT_ADDRESS } from 'common/governance-contract';
import { prisma } from 'db/client';
import { VoteType } from '@prisma/client';

/**
 * VoteCacheListener class
 * Follows the same pattern as BlockchainListener for consistency
 */
class VoteCacheListener {
  private provider: ethers.Provider | null = null;
  private contract: ethers.Contract | null = null;
  private isListening = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Start listening for VoteCast events
   */
  async start() {
    if (this.isListening) {
      console.log('[VoteCacheListener] Already running');
      return;
    }

    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL;
      if (!rpcUrl) {
        throw new Error('ETHEREUM_RPC_URL environment variable is required');
      }

      // Initialize provider and contract
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.contract = createGovernanceContract(this.provider);

      // Verify connection
      const network = await this.provider.getNetwork();
      console.log(
        `[VoteCacheListener] Connected to Ethereum network: ${network.name} (${network.chainId})`
      );

      // Setup event listener for VoteCast
      this.contract.on('VoteCast', this.handleVoteCastEvent.bind(this));

      // Setup provider error handler
      this.provider.on('error', this.handleProviderError.bind(this));

      this.isListening = true;
      this.reconnectAttempts = 0;
      console.log(
        `[VoteCacheListener] Listening for VoteCast events on contract: ${GOVERNANCE_CONTRACT_ADDRESS}`
      );

      // Process past events on startup
      await this.processPastEvents();
    } catch (error) {
      console.error('[VoteCacheListener] Failed to start:', error);
      await this.handleReconnect();
    }
  }

  /**
   * Stop listening for events
   */
  async stop() {
    if (!this.isListening) {
      console.log('[VoteCacheListener] Not currently running');
      return;
    }

    try {
      if (this.contract) {
        this.contract.removeAllListeners('VoteCast');
      }

      if (this.provider) {
        this.provider.removeAllListeners('error');
        await this.provider.destroy();
      }

      this.isListening = false;
      this.provider = null;
      this.contract = null;
      console.log('[VoteCacheListener] Stopped successfully');
    } catch (error) {
      console.error('[VoteCacheListener] Error stopping:', error);
    }
  }

  /**
   * Process past VoteCast events on startup
   * Queries last 50 blocks in chunks of 10 to avoid rate limits
   */
  private async processPastEvents() {
    if (!this.contract || !this.provider) return;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const blocksToCheck = 50;
      const chunkSize = 10;
      const fromBlock = Math.max(0, currentBlock - blocksToCheck);

      console.log(
        `[VoteCacheListener] Checking past VoteCast events from block ${fromBlock} to ${currentBlock}`
      );

      const filter = this.contract.filters.VoteCast();
      let allEvents: ethers.Log[] = [];

      // Query in chunks to avoid rate limits
      for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, currentBlock);

        try {
          console.log(`[VoteCacheListener] Querying blocks ${start} to ${end}`);

          const events = await this.contract.queryFilter(filter, start, end);

          console.log(`[VoteCacheListener] Found ${events.length} events in blocks ${start}-${end}`);
          allEvents = allEvents.concat(events);

          // Rate limiting delay
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (chunkError) {
          console.error(
            `[VoteCacheListener] Error querying blocks ${start}-${end}:`,
            chunkError
          );
          // Continue with next chunk
        }
      }

      // Process all collected events
      for (const event of allEvents) {
        await this.processVoteCastEvent(event, undefined);
      }

      console.log(
        `[VoteCacheListener] Processed ${allEvents.length} past events from ${blocksToCheck} blocks`
      );
    } catch (error) {
      console.error('[VoteCacheListener] Error processing past events:', error);
    }
  }

  /**
   * Handle VoteCast event from contract listener
   */
  private async handleVoteCastEvent(...args: unknown[]) {
    // Last argument is the event object
    const event = args[args.length - 1] as { log?: ethers.Log; args: unknown[] } & ethers.Log;
    const log = event.log || event;
    await this.processVoteCastEvent(log, event.args);
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

      // Parse event if args not provided
      let parsedEvent;
      if (precomputedArgs) {
        parsedEvent = { args: precomputedArgs };
      } else {
        try {
          parsedEvent = this.contract.interface.parseLog({
            topics: event.topics,
            data: event.data || '0x',
          });
        } catch (parseError) {
          console.error('[VoteCacheListener] Failed to parse event:', parseError);
          return;
        }
      }

      if (!parsedEvent || !parsedEvent.args) {
        console.error('[VoteCacheListener] No parsed event args');
        return;
      }

      // Extract event data
      const proposalId = parsedEvent.args[0] as bigint;
      const voterAddress = (parsedEvent.args[1] as string).toLowerCase();
      const support = parsedEvent.args[2] as boolean;
      const timestamp = parsedEvent.args[3] as bigint;

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

  /**
   * Handle provider errors
   */
  private async handleProviderError(error: Error) {
    console.error('[VoteCacheListener] Provider error:', error);
    await this.handleReconnect();
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[VoteCacheListener] Max reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff: 2s, 4s, 8s, 16s, 32s

    console.log(
      `[VoteCacheListener] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    // Stop current listeners
    this.isListening = false;
    if (this.contract) {
      this.contract.removeAllListeners('VoteCast');
    }
    if (this.provider) {
      this.provider.removeAllListeners('error');
    }

    // Attempt to restart
    await this.start();
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
