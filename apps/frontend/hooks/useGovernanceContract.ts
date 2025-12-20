/**
 * useGovernanceContract Hook
 * 
 * React hook for interacting with the W3Governance smart contract from the frontend.
 * Handles MetaMask connection, network verification, and contract method calls.
 * 
 * Features:
 * - Automatic contract initialization
 * - Network validation (Sepolia only)
 * - MetaMask connection handling
 * - Contract method wrappers (createProposal, vote, getProposal, getVote)
 * - Automatic reconnection on network changes
 * 
 * Usage:
 * ```typescript
 * const { isConnected, error, createProposal, vote } = useGovernanceContract();
 * 
 * // Create a proposal
 * const result = await createProposal(contentHash, votingDuration);
 * 
 * // Vote on a proposal
 * const voteResult = await vote(proposalId, true); // true = upvote
 * ```
 */

import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { createGovernanceContract, W3GovernanceContract } from 'common/governance-contract';

interface ProposalCreationResult {
  proposalId: number;
  txHash: string;
  blockNumber: number;
}

interface VoteResult {
  txHash: string;
  blockNumber: number;
}

interface ProposalData {
  proposer: string;
  contentHash: string;
  votingEndsAt: bigint;
  upvotes: bigint;
  downvotes: bigint;
  finalized: boolean;
  passed: boolean;
}

interface VoteData {
  hasVoted: boolean;
  support: boolean;
}

interface CustomError extends Error {
  code?: string | number;
  data?: string;
  info?: {
    error?: {
      code?: number;
      data?: string;
    };
  };
}

export function useGovernanceContract() {
  const [contract, setContract] = useState<W3GovernanceContract | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initContract = async () => {
      try {
        if (typeof window === 'undefined' || !window.ethereum) {
          setError('MetaMask not installed');
          return;
        }

        const browserProvider = new BrowserProvider(window.ethereum);
        const network = await browserProvider.getNetwork();

        // Sepolia chainId = 11155111
        if (network.chainId !== BigInt(process.env.NEXT_PUBLIC_CHAIN_ID!)) {
          setError(`Please switch to correct network with chain id: ${process.env.NEXT_PUBLIC_CHAIN_ID}`);
          return;
        }

        const contractInstance = createGovernanceContract(browserProvider);
        setContract(contractInstance);
        setProvider(browserProvider);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize contract');
      }
    };

    initContract();

    // Listen for network changes
    if (typeof window !== 'undefined' && window.ethereum?.on) {
      window.ethereum.on('chainChanged', () => {
        initContract();
      });
    }

    return () => {
      if (typeof window !== 'undefined' && window.ethereum?.removeListener) {
        window.ethereum.removeListener('chainChanged', initContract);
      }
    };
  }, []);

  /**
   * Decode custom Solidity errors from transaction failures
   * Handles InsufficientReputation and other contract-specific errors
   */
  function decodeContractError(error: CustomError): string {
    // Check for common MetaMask errors first
    if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
      return 'Transaction rejected by user';
    }

    const errorMessage = error.message || '';

    // Check for insufficient reputation error pattern
    if (errorMessage.includes('InsufficientReputation') ||
        errorMessage.includes('revert data') ||
        errorMessage.includes('CALL_EXCEPTION')) {
      return 'Insufficient reputation balance. You need 500 REP to create proposals.';
    }

    // Check for insufficient funds
    if (errorMessage.includes('insufficient funds')) {
      return 'Insufficient ETH for gas fees. Please add Sepolia ETH to your wallet.';
    }

    // Check for network errors
    if (errorMessage.includes('network') || errorMessage.includes('chainId')) {
      return 'Please connect to Sepolia testnet in MetaMask.';
    }

    // Check for other custom errors
    if (errorMessage.includes('EmptyContentHash')) {
      return 'Invalid proposal content hash.';
    }

    if (errorMessage.includes('InvalidVotingDuration')) {
      return 'Invalid voting duration. Must be between 1 and 30 days.';
    }

    if (errorMessage.includes('AlreadyVoted')) {
      return 'You have already voted on this proposal.';
    }

    if (errorMessage.includes('VotingEnded')) {
      return 'Voting period has ended for this proposal.';
    }

    // Generic fallback
    return `Transaction failed: ${errorMessage}`;
  }

  /**
   * Create a new proposal on-chain
   * @param contentHash - keccak256 hash of proposal content
   * @param votingDuration - Duration in seconds (default: 7 days)
   * @returns Proposal creation result with proposalId, txHash, and blockNumber
   */
  const createProposal = async (
    contentHash: string,
    votingDuration: number = 7 * 24 * 60 * 60
  ): Promise<ProposalCreationResult> => {
    if (!contract || !provider) {
      throw new Error('Contract not initialized');
    }

    try {
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer) as W3GovernanceContract;

      // IMPORTANT: Estimate gas first to catch reverts early
      try {
        const createProposalFn = contractWithSigner.getFunction("createProposal");
        await createProposalFn.estimateGas(contentHash, votingDuration);
      } catch (estimateError) {
        // Decode and throw user-friendly error
        const friendlyError = decodeContractError(estimateError as CustomError);
        throw new Error(friendlyError);
      }

      // If estimation succeeds, proceed with transaction
      const createProposalFn = contractWithSigner.getFunction("createProposal");
      const tx = await createProposalFn(contentHash, votingDuration);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      // Parse ProposalCreated event
      const event = receipt.logs.find((log: any) => {
        try {
          return contract.interface.parseLog(log)?.name === 'ProposalCreated';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('ProposalCreated event not found in transaction receipt');
      }

      const parsed = contract.interface.parseLog(event)!;

      return {
        proposalId: Number(parsed.args.proposalId),
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      // If not already decoded, decode it now
      if (error instanceof Error && !error.message.includes('Insufficient reputation')) {
        const friendlyError = decodeContractError(error as CustomError);
        throw new Error(friendlyError);
      }
      throw error;
    }
  };

  /**
   * Vote on a proposal
   * @param proposalId - On-chain proposal ID
   * @param support - true for upvote, false for downvote
   * @returns Vote result with txHash and blockNumber
   */
  const vote = async (proposalId: number, support: boolean): Promise<VoteResult> => {
    if (!contract || !provider) {
      throw new Error('Contract not initialized');
    }

    try {
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer) as W3GovernanceContract;

      // Estimate gas first to catch reverts early
      try {
        const voteFn = contractWithSigner.getFunction("vote");
        await voteFn.estimateGas(proposalId, support);
      } catch (estimateError) {
        const friendlyError = decodeContractError(estimateError as CustomError);
        throw new Error(friendlyError);
      }

      const voteFn = contractWithSigner.getFunction("vote");
      const tx = await voteFn(proposalId, support);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      if (error instanceof Error && !error.message.includes('Insufficient reputation')) {
        const friendlyError = decodeContractError(error as CustomError);
        throw new Error(friendlyError);
      }
      throw error;
    }
  };

  /**
   * Get proposal data from blockchain
   * @param proposalId - On-chain proposal ID
   * @returns Proposal data
   */
  const getProposal = async (proposalId: number): Promise<ProposalData> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    const getProposalFn = contract.getFunction("getProposal");
    const data = await getProposalFn(proposalId);

    return {
      proposer: data.proposer,
      contentHash: data.contentHash,
      votingEndsAt: data.votingEndsAt,
      upvotes: data.upvotes,
      downvotes: data.downvotes,
      finalized: data.finalized,
      passed: data.passed,
    };
  };

  /**
   * Get vote status for a specific voter
   * @param proposalId - On-chain proposal ID
   * @param voter - Voter's wallet address
   * @returns Vote data (hasVoted, support)
   */
  const getVote = async (proposalId: number, voter: string): Promise<VoteData> => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    const getVoteFn = contract.getFunction("getVote");
    const [hasVoted, support] = await getVoteFn(proposalId, voter);

    return {
      hasVoted,
      support,
    };
  };

  return {
    contract,
    provider,
    isConnected,
    error,
    createProposal,
    vote,
    getProposal,
    getVote,
  };
}
