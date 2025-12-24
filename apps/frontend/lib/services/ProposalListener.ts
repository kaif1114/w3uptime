import { ethers } from "ethers";
import { createGovernanceContract, GOVERNANCE_CONTRACT_ADDRESS, type W3GovernanceContract } from "common/governance-contract";
import { prisma } from "db/client";
import { BaseBlockListener } from "./BaseBlockListener";

/**
 * ProposalEventListener
 *
 * Listens for ProposalCreated and ProposalFinalized events from the W3Governance
 * smart contract and syncs them to the database for fast queries.
 *
 * Features:
 * - Block polling (no filter expiration)
 * - Automatic reconnection with exponential backoff
 * - Processing of past events on startup
 * - Idempotent event handling (duplicate protection)
 * - Error recovery and logging
 */
export class ProposalEventListener extends BaseBlockListener<W3GovernanceContract> {
  getListenerName(): string {
    return "proposal";
  }

  createContract(provider: ethers.Provider): W3GovernanceContract {
    return createGovernanceContract(provider);
  }

  getEventFilters(): (ethers.DeferredTopicFilter | ethers.EventFilter)[] {
    if (!this.contract) return [];
    return [
      this.contract.filters.ProposalCreated(),
      this.contract.filters.ProposalFinalized()
    ];
  }

  async processEvent(event: ethers.Log): Promise<void> {
    if (!this.contract) return;

    const parsed = this.contract.interface.parseLog({
      topics: [...event.topics],
      data: event.data,
    });

    if (!parsed) return;

    if (parsed.name === "ProposalCreated") {
      await this.handleProposalCreated(
        parsed.args.proposalId,
        parsed.args.proposer,
        parsed.args.contentHash,
        parsed.args.votingEndsAt,
        event
      );
    } else if (parsed.name === "ProposalFinalized") {
      await this.handleProposalFinalized(
        parsed.args.proposalId,
        parsed.args.upvotes,
        parsed.args.downvotes,
        parsed.args.passed,
        event
      );
    }
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

  getStatus() {
    return {
      ...super.getStatus(),
      contractAddress: GOVERNANCE_CONTRACT_ADDRESS
    };
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
