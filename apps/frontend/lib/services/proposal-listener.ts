import { ethers } from "ethers";
import { createGovernanceContract, GOVERNANCE_CONTRACT_ADDRESS, type W3GovernanceContract } from "common/governance-contract";
import { prisma } from "db/client";

/**
 * ProposalEventListener
 * 
 * Listens for ProposalCreated and ProposalFinalized events from the W3Governance
 * smart contract and syncs them to the database for fast queries.
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Processing of past events on startup
 * - Idempotent event handling (duplicate protection)
 * - Error recovery and logging
 */
export class ProposalEventListener {
  private provider: ethers.Provider | null = null;
  private contract: W3GovernanceContract | null = null;
  private isListening = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  /**
   * Start listening for governance events
   */
  async start() {
    if (this.isListening) {
      console.log("[Governance Listener] Already running");
      return;
    }

    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL;
      if (!rpcUrl) {
        throw new Error("ETHEREUM_RPC_URL environment variable is required");
      }

      // Initialize provider and contract
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.contract = createGovernanceContract(this.provider);

      // Verify connection
      const network = await this.provider.getNetwork();
      console.log(`[Governance Listener] Connected to network: ${network.name} (${network.chainId})`);

      // Listen for ProposalCreated events
      this.contract.on("ProposalCreated", async (proposalId, proposer, contentHash, votingEndsAt, event) => {
        await this.handleProposalCreated(proposalId, proposer, contentHash, votingEndsAt, event);
      });

      // Listen for ProposalFinalized events
      this.contract.on("ProposalFinalized", async (proposalId, upvotes, downvotes, passed, event) => {
        await this.handleProposalFinalized(proposalId, upvotes, downvotes, passed, event);
      });

      // Handle provider errors
      this.provider.on("error", this.handleProviderError.bind(this));

      this.isListening = true;
      this.reconnectAttempts = 0;
      console.log(`[Governance Listener] Listening for events on contract: ${GOVERNANCE_CONTRACT_ADDRESS}`);

      // Process past events on startup
      await this.processPastEvents();

    } catch (error) {
      console.error("[Governance Listener] Failed to start:", error);
      await this.handleReconnect();
    }
  }

  /**
   * Stop listening and cleanup
   */
  async stop() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.contract) {
      this.contract.removeAllListeners();
    }

    if (this.provider) {
      this.provider.removeAllListeners();
      this.provider = null;
    }

    this.contract = null;
    this.isListening = false;
    console.log("[Governance Listener] Stopped");
  }

  /**
   * Handle ProposalCreated event
   */
  private async handleProposalCreated(
    proposalId: bigint,
    proposer: string,
    contentHash: string,
    votingEndsAt: bigint,
    event: ethers.Log
  ) {
    try {
      console.log(`[Governance Listener] ProposalCreated: ID ${proposalId}, proposer ${proposer}`);

      const txHash = event.transactionHash;
      const blockNumber = event.blockNumber;

      // Find proposal by content hash
      const proposal = await prisma.proposal.findFirst({
        where: {
          contentHash,
          onChainId: null, // Only update proposals that haven't been confirmed yet
        },
      });

      if (!proposal) {
        console.warn(`[Governance Listener] No matching proposal found for contentHash ${contentHash}`);
        return;
      }

      // Update proposal with on-chain data
      await prisma.proposal.update({
        where: { id: proposal.id },
        data: {
          onChainId: Number(proposalId),
          creationTxHash: txHash,
          votingEndsAt: new Date(Number(votingEndsAt) * 1000), // Convert Unix timestamp to Date
          onChainStatus: "ACTIVE",
        },
      });

      console.log(`[Governance Listener] Updated proposal ${proposal.id} with on-chain ID ${proposalId}`);
    } catch (error) {
      console.error("[Governance Listener] Error handling ProposalCreated:", error);
    }
  }

  /**
   * Handle ProposalFinalized event
   */
  private async handleProposalFinalized(
    proposalId: bigint,
    upvotes: bigint,
    downvotes: bigint,
    passed: boolean,
    event: ethers.Log
  ) {
    try {
      console.log(`[Governance Listener] ProposalFinalized: ID ${proposalId}, passed: ${passed}`);

      const txHash = event.transactionHash;

      // Find proposal by on-chain ID
      const proposal = await prisma.proposal.findUnique({
        where: { onChainId: Number(proposalId) },
      });

      if (!proposal) {
        console.warn(`[Governance Listener] No proposal found with onChainId ${proposalId}`);
        return;
      }

      // Update proposal with finalization data
      await prisma.proposal.update({
        where: { id: proposal.id },
        data: {
          finalizationTxHash: txHash,
          onChainStatus: passed ? "PASSED" : "FAILED",
          status: passed ? "APPROVED" : "REJECTED", // Update legacy status field
        },
      });

      console.log(`[Governance Listener] Finalized proposal ${proposal.id}: ${passed ? "PASSED" : "FAILED"}`);
    } catch (error) {
      console.error("[Governance Listener] Error handling ProposalFinalized:", error);
    }
  }

  /**
   * Process past events on startup
   */
  private async processPastEvents() {
    if (!this.contract || !this.provider) return;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const blocksToCheck = 50; // Last 50 blocks
      const chunkSize = 10;
      const fromBlock = Math.max(0, currentBlock - blocksToCheck);

      console.log(`[Governance Listener] Checking past events from block ${fromBlock} to ${currentBlock}`);

      // Query ProposalCreated events
      const createdFilter = this.contract.filters.ProposalCreated();
      const finalizedFilter = this.contract.filters.ProposalFinalized();

      for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, currentBlock);

        try {
          const [createdEvents, finalizedEvents] = await Promise.all([
            this.contract.queryFilter(createdFilter, start, end),
            this.contract.queryFilter(finalizedFilter, start, end),
          ]);

          console.log(`[Governance Listener] Found ${createdEvents.length} created, ${finalizedEvents.length} finalized events in blocks ${start}-${end}`);

          // Process events
          for (const event of createdEvents) {
            const parsed = this.contract.interface.parseLog({
              topics: [...event.topics],
              data: event.data,
            });
            if (parsed) {
              await this.handleProposalCreated(
                parsed.args.proposalId,
                parsed.args.proposer,
                parsed.args.contentHash,
                parsed.args.votingEndsAt,
                event
              );
            }
          }

          for (const event of finalizedEvents) {
            const parsed = this.contract.interface.parseLog({
              topics: [...event.topics],
              data: event.data,
            });
            if (parsed) {
              await this.handleProposalFinalized(
                parsed.args.proposalId,
                parsed.args.upvotes,
                parsed.args.downvotes,
                parsed.args.passed,
                event
              );
            }
          }

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (chunkError) {
          console.error(`[Governance Listener] Error querying blocks ${start}-${end}:`, chunkError);
        }
      }

      console.log(`[Governance Listener] Finished processing past events`);
    } catch (error) {
      console.error("[Governance Listener] Error processing past events:", error);
    }
  }

  /**
   * Handle provider errors
   */
  private async handleProviderError(error: Error) {
    console.error("[Governance Listener] Provider error:", error);
    await this.handleReconnect();
  }

  /**
   * Reconnect with exponential backoff
   */
  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[Governance Listener] Max reconnection attempts reached. Stopping.");
      await this.stop();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Max 30s

    console.log(`[Governance Listener] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    // Cleanup current connection
    if (this.contract) {
      this.contract.removeAllListeners();
      this.contract = null;
    }
    if (this.provider) {
      this.provider.removeAllListeners();
      this.provider = null;
    }
    this.isListening = false;

    // Schedule reconnection
    this.reconnectTimeout = setTimeout(() => {
      this.start();
    }, delay);
  }
}

// Singleton instance
let listenerInstance: ProposalEventListener | null = null;

/**
 * Get or create the governance event listener instance
 */
export function getProposalListener(): ProposalEventListener {
  if (!listenerInstance) {
    listenerInstance = new ProposalEventListener();
  }
  return listenerInstance;
}

/**
 * Start the governance event listener
 */
export async function startProposalListener() {
  const listener = getProposalListener();
  await listener.start();
}

/**
 * Stop the governance event listener
 */
export async function stopProposalListener() {
  if (listenerInstance) {
    await listenerInstance.stop();
    listenerInstance = null;
  }
}
