'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { connectWallet, createReputationContractWithSigner } from '@/lib/contracts/ClaimReputationContract';

export interface ClaimSignatureResponse {
  signature: string;
  nonce: string;
  expiry: string;
  amount: number;
  userAddress: string;
  breakdown: {
    totalScore: number;
    validatorScore: number;
    customerScore: number;
    monitorScore: number;
    depositScore: number;
    ageScore: number;
  };
}

export interface ClaimReputationResult {
  transactionHash: string;
  blockNumber?: number;
  amount: string;
}

interface ClaimReputationParams {
  onProgress?: (step: string) => void;
}

async function claimReputation(params: ClaimReputationParams): Promise<ClaimReputationResult> {
  const { onProgress } = params;

  try {
    // Step 1: Fetch claim signature from API
    onProgress?.('Fetching claim signature...');
    const response = await fetch('/api/reputation/claim', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch claim signature');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch claim signature');
    }

    const signatureData = result.data as ClaimSignatureResponse;

    // Step 2: Connect to MetaMask
    onProgress?.('Connecting to wallet...');
    const { signer, address } = await connectWallet();

    // Verify connected address matches signature address
    if (address.toLowerCase() !== signatureData.userAddress.toLowerCase()) {
      throw new Error('Connected wallet address does not match your account. Please switch to the correct wallet.');
    }

    // Step 3: Prepare claim transaction
    onProgress?.('Preparing claim transaction...');
    const contract = createReputationContractWithSigner(signer);

    // Convert parameters to proper types
    const amount = BigInt(signatureData.amount);
    const nonce = BigInt(signatureData.nonce);
    const expiry = BigInt(signatureData.expiry);

    // Step 4: Execute claim transaction
    onProgress?.('Claiming reputation...');
    const tx = await contract.claimReputation(
      amount,
      nonce,
      expiry,
      signatureData.signature
    );

    // Step 5: Wait for confirmation
    onProgress?.('Waiting for confirmation...');
    const receipt = await tx.wait(1);

    onProgress?.('Transaction confirmed!');

    // Step 6: Record successful claim in database
    try {
      await fetch('/api/reputation/claim-success', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionHash: receipt.hash,
          amount: signatureData.amount,
        }),
      });
    } catch (dbError) {
      console.warn('Failed to record claim in database:', dbError);
      // Don't fail the entire operation if DB update fails
    }

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      amount: signatureData.amount.toString(),
    };

  } catch (error: unknown) {
    const errorObj = error as { code?: number; message?: string };
    const errorMessage = errorObj.message || '';

    // User rejection
    if (errorObj.code === 4001) {
      throw new Error('Transaction rejected by user');
    }

    // MetaMask not installed
    if (errorMessage.includes('MetaMask is not installed')) {
      throw new Error('MetaMask is not installed. Please install MetaMask to claim reputation.');
    }

    // Wallet address mismatch
    if (errorMessage.includes('does not match your account')) {
      throw new Error(errorMessage);
    }

    // Contract-specific errors
    if (errorMessage.includes('InsufficientReputationAmount') || errorMessage.includes('InvalidReputationAmount')) {
      throw new Error('No reputation available to claim');
    }
    if (errorMessage.includes('InvalidReputationSignature')) {
      throw new Error('Invalid claim signature - please try again');
    }
    if (errorMessage.includes('ReputationAuthorizationExpired')) {
      throw new Error('Claim signature expired - please refresh and try again');
    }
    if (errorMessage.includes('ReputationNonceAlreadyUsed')) {
      throw new Error('This reputation has already been claimed');
    }

    // Gas errors
    if (errorMessage.includes('insufficient funds')) {
      throw new Error('Insufficient ETH for gas fees. Please add ETH to your wallet.');
    }
    if (errorMessage.includes('gas required exceeds allowance')) {
      throw new Error('Transaction would fail - insufficient gas');
    }

    // Network errors
    if (errorMessage.includes('network')) {
      throw new Error('Network error - please check your connection and try again');
    }

    // API errors
    if (errorMessage.includes('Too many claim attempts')) {
      throw new Error(errorMessage);
    }
    if (errorMessage.includes('No unclaimed reputation available')) {
      throw new Error('No unclaimed reputation available');
    }

    // Fallback
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred during claim. Please try again.');
  }
}

export function useClaimReputation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: claimReputation,
    onSuccess: () => {
      // Invalidate all reputation-related queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['reputation'] });
      queryClient.invalidateQueries({ queryKey: ['reputation-with-claiming'] });
      queryClient.invalidateQueries({ queryKey: ['community', 'reputation'] });
      // Invalidate on-chain reputation to force immediate refresh after claim
      queryClient.invalidateQueries({ queryKey: ['onChainReputation'] });
    },
  });
}
