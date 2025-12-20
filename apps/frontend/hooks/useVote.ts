/**
 * useVote Hook
 * 
 * React hook for direct on-chain voting via MetaMask transaction.
 * Users pay gas to vote directly on the blockchain, eliminating the need for backend signatures.
 * 
 * REQUIRES: W3Governance contract must have a vote() function:
 * function vote(uint256 proposalId, bool support) external whenNotPaused
 * 
 * Features:
 * - Direct MetaMask transaction for voting
 * - Network validation (Sepolia only)
 * - Comprehensive error handling
 * - Automatic query invalidation on success
 * - User-friendly error messages
 * 
 * Usage:
 * ```typescript
 * const { vote, isLoading, error, isSuccess } = useVote();
 * 
 * // Vote on a proposal
 * await vote({ proposalId: 1, support: true }); // true = upvote, false = downvote
 * ```
 * 
 * Error Handling:
 * - User rejection (code 4001)
 * - Wrong network
 * - Insufficient gas
 * - Contract reverts (proposal not found, voting ended, already voted, etc.)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BrowserProvider } from 'ethers';
import { createGovernanceContractWithSigner } from 'common/governance-contract';

interface VoteParams {
  proposalId: number;
  support: boolean; // true = upvote, false = downvote
}

interface VoteResult {
  transactionHash: string;
  blockNumber: number;
  proposalId: number;
  support: boolean;
}

/**
 * Parse error message to provide user-friendly feedback
 */
function parseVoteError(error: any): string {
  // User rejected transaction
  if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
    return 'Transaction rejected by user';
  }

  // Wrong network
  if (error.message?.includes('chainId') || error.message?.includes('network')) {
    return 'Please connect to Sepolia testnet';
  }

  // Insufficient gas
  if (
    error.message?.includes('insufficient funds') ||
    error.message?.includes('gas')
  ) {
    return 'Insufficient funds for gas. Please ensure you have enough ETH.';
  }

  // Contract-specific errors
  if (error.message?.includes('Proposal not found')) {
    return 'Proposal not found on-chain';
  }

  if (error.message?.includes('Voting period ended')) {
    return 'Voting period has ended for this proposal';
  }

  if (error.message?.includes('Already voted')) {
    return 'You have already voted on this proposal';
  }

  if (error.message?.includes('Proposal is finalized')) {
    return 'This proposal has been finalized and cannot be voted on';
  }

  // Generic error
  return error.message || 'Failed to submit vote transaction';
}

export function useVote() {
  const queryClient = useQueryClient();

  const voteMutation = useMutation<VoteResult, Error, VoteParams>({
    mutationFn: async ({ proposalId, support }: VoteParams) => {
      // Check MetaMask availability
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Get provider and signer
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Verify network (Sepolia = chainId 11155111)
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(11155111)) {
        throw new Error('Please connect to Sepolia testnet');
      }

      // Get contract instance with signer
      const contract = createGovernanceContractWithSigner(signer);

      // Get the vote function
      const voteFn = contract.getFunction("vote");
      
      // Call vote function on contract
      const tx = await voteFn(proposalId, support);

      // Wait for transaction confirmation
      const receipt = await tx.wait(1);

      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        proposalId,
        support,
      };
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh proposal data
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal', String(data.proposalId)] });
      queryClient.invalidateQueries({
        queryKey: ['proposalVotes', String(data.proposalId)],
      });
      queryClient.invalidateQueries({ queryKey: ['userVote', String(data.proposalId)] });
    },
    onError: (error: Error) => {
      console.error('Vote transaction error:', error);
    },
  });

  return {
    vote: voteMutation.mutate,
    voteAsync: voteMutation.mutateAsync,
    isLoading: voteMutation.isPending,
    error: voteMutation.error ? parseVoteError(voteMutation.error) : null,
    rawError: voteMutation.error,
    isSuccess: voteMutation.isSuccess,
    data: voteMutation.data,
    reset: voteMutation.reset,
  };
}
