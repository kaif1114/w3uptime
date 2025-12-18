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
import { Contract, BrowserProvider } from 'ethers';
import { createGovernanceContract } from 'common/governance-contract';

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

export function useGovernanceContract() {
  const [contract, setContract] = useState<Contract | null>(null);
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

    const signer = await provider.getSigner();
    const contractWithSigner = contract.connect(signer) as any;

    const tx = await contractWithSigner.createProposal(contentHash, votingDuration);
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

    const signer = await provider.getSigner();
    const contractWithSigner = contract.connect(signer) as any;

    const tx = await contractWithSigner.vote(proposalId, support);
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction receipt not available');
    }

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
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

    const data = await (contract as any).getProposal(proposalId);

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

    const [hasVoted, support] = await (contract as any).getVote(proposalId, voter);

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
