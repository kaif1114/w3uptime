import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { createContractInstanceWithSigner } from 'common/contract';
import { WithdrawalSignature } from './useWithdrawals';

export interface WithdrawalExecutionResult {
  transactionHash: string;
  blockNumber?: number;
}

export function useExecuteWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      withdrawalId: string;
      signature: WithdrawalSignature;
      onProgress?: (step: string) => void;
    }): Promise<WithdrawalExecutionResult> => {
      const { withdrawalId, signature, onProgress } = params;

      try {
        onProgress?.('Connecting to wallet...');

        
        if (!window.ethereum) {
          throw new Error('MetaMask is not installed');
        }

        
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        
        const connectedAddress = await signer.getAddress();
        if (connectedAddress.toLowerCase() !== signature.userAddress.toLowerCase()) {
          throw new Error('Connected wallet address does not match withdrawal address');
        }

        onProgress?.('Preparing withdrawal transaction...');

        
        const contract = createContractInstanceWithSigner(signer);

        
        onProgress?.('Executing withdrawal...');
        
        const tx = await contract.withdraw(
          BigInt(signature.amount),
          BigInt(signature.nonce),
          BigInt(signature.expiry),
          signature.signature
        );

        onProgress?.('Waiting for confirmation...');

        
        const receipt = await tx.wait(1);

        if (!receipt) {
          throw new Error('Transaction receipt not available');
        }

        onProgress?.('Transaction confirmed! Waiting for blockchain listener...');

        return {
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber
        };

      } catch (error: unknown) {
        console.error('Withdrawal execution error:', error);
        
        
        const errorObj = error as { code?: number; message?: string };
        const errorMessage = errorObj.message || '';
        
        if (errorObj.code === 4001) {
          throw new Error('Transaction rejected by user');
        } else if (errorMessage.includes('insufficient funds')) {
          throw new Error('Insufficient funds for transaction');
        } else if (errorMessage.includes('AuthorizationExpired')) {
          throw new Error('Withdrawal authorization has expired. Please request a new withdrawal.');
        } else if (errorMessage.includes('NonceAlreadyUsed')) {
          throw new Error('This withdrawal has already been processed');
        } else if (errorMessage.includes('InvalidSignature')) {
          throw new Error('Invalid withdrawal signature');
        } else if (errorMessage.includes('AmountBelowMinimum')) {
          throw new Error('Withdrawal amount is below minimum');
        } else if (errorMessage.includes('AmountAboveMaximum')) {
          throw new Error('Withdrawal amount is above maximum');
        } else if (errorMessage.includes('InsufficientContractBalance')) {
          throw new Error('Contract has insufficient balance for withdrawal');
        }
        
        if (error instanceof Error) {
          throw error;
        }
        
        throw new Error('Unknown error occurred during withdrawal');
      }
    },
    onSuccess: (result) => {
      
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] }); 
    },
  });
}


export function useWithdrawalLimits() {
  return useMutation({
    mutationFn: async (): Promise<{ min: string; max: string }> => {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = createContractInstanceWithSigner(await provider.getSigner());

      const [minAmount, maxAmount] = await Promise.all([
        contract.minWithdrawalAmount(),
        contract.maxWithdrawalAmount()
      ]);

      return {
        min: ethers.formatEther(minAmount),
        max: ethers.formatEther(maxAmount)
      };
    },
  });
}