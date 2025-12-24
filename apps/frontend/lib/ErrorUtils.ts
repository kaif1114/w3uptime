/**
 * Parse contract errors and return user-friendly messages
 */

export interface ParsedError {
  message: string;
  code?: string;
  isUserError: boolean;
  suggestion?: string;
}

/**
 * Parse ethers.js contract errors into user-friendly messages
 * @param error Error object from contract call
 * @returns User-friendly error message
 */
export function parseContractError(error: unknown): ParsedError {
  const errorObj = error as {
    code?: string | number;
    message?: string;
    reason?: string;
    data?: {
      message?: string;
    };
  };

  // User rejection
  if (errorObj.code === 'ACTION_REJECTED' || errorObj.code === 4001) {
    return {
      message: 'Transaction rejected by user',
      code: 'USER_REJECTED',
      isUserError: true,
    };
  }

  // Insufficient funds
  if (
    errorObj.code === 'INSUFFICIENT_FUNDS' ||
    errorObj.message?.toLowerCase().includes('insufficient funds')
  ) {
    return {
      message: 'Insufficient ETH in wallet to pay gas fees',
      code: 'INSUFFICIENT_FUNDS',
      isUserError: true,
      suggestion: 'Please add ETH to your wallet from a Sepolia faucet',
    };
  }

  // Network errors
  if (
    errorObj.code === 'NETWORK_ERROR' ||
    errorObj.message?.toLowerCase().includes('network')
  ) {
    return {
      message: 'Network error - please check your connection',
      code: 'NETWORK_ERROR',
      isUserError: false,
      suggestion: 'Try again in a few moments',
    };
  }

  // Wrong network
  if (errorObj.message?.toLowerCase().includes('network')) {
    return {
      message: 'Please connect to Sepolia testnet',
      code: 'WRONG_NETWORK',
      isUserError: true,
      suggestion: 'Switch to Sepolia network in MetaMask',
    };
  }

  // Gas estimation failed
  if (
    errorObj.message?.toLowerCase().includes('gas') &&
    errorObj.message?.toLowerCase().includes('estimation')
  ) {
    return {
      message: 'Transaction would fail - please check requirements',
      code: 'GAS_ESTIMATION_FAILED',
      isUserError: false,
      suggestion: 'The transaction cannot be executed. Please verify all conditions are met.',
    };
  }

  // Execution reverted
  if (errorObj.message?.includes('execution reverted')) {
    // Try to extract revert reason
    const match = errorObj.message.match(/reason="([^"]+)"/);
    const reason = match ? match[1] : null;

    if (reason) {
      return {
        message: `Contract error: ${reason}`,
        code: 'CONTRACT_REVERT',
        isUserError: false,
        suggestion: getSuggestionForRevertReason(reason),
      };
    }

    return {
      message: 'Transaction would fail - please check requirements',
      code: 'CONTRACT_REVERT',
      isUserError: false,
    };
  }

  // Contract-specific errors
  if (errorObj.message?.includes('InvalidProposalId')) {
    return {
      message: 'Proposal not found on blockchain',
      code: 'INVALID_PROPOSAL',
      isUserError: false,
    };
  }

  if (errorObj.message?.includes('VotingEnded')) {
    return {
      message: 'Voting period has ended for this proposal',
      code: 'VOTING_ENDED',
      isUserError: true,
    };
  }

  if (errorObj.message?.includes('AlreadyVoted')) {
    return {
      message: 'You have already voted on this proposal',
      code: 'ALREADY_VOTED',
      isUserError: true,
      suggestion: 'Vote changes are not allowed in direct on-chain voting',
    };
  }

  if (errorObj.message?.includes('VotingNotEnded')) {
    return {
      message: 'Voting period has not ended yet',
      code: 'VOTING_NOT_ENDED',
      isUserError: true,
    };
  }

  if (errorObj.message?.includes('AlreadyFinalized')) {
    return {
      message: 'This proposal has already been finalized',
      code: 'ALREADY_FINALIZED',
      isUserError: true,
    };
  }

  // MetaMask not installed
  if (errorObj.message?.includes('MetaMask')) {
    return {
      message: 'MetaMask is not installed',
      code: 'NO_WALLET',
      isUserError: true,
      suggestion: 'Please install MetaMask browser extension',
    };
  }

  // Generic fallback
  const message = errorObj.message || errorObj.reason || 'Unknown error occurred';
  return {
    message,
    code: 'UNKNOWN',
    isUserError: false,
  };
}

/**
 * Get suggestion based on revert reason
 */
function getSuggestionForRevertReason(reason: string): string | undefined {
  const lowerReason = reason.toLowerCase();

  if (lowerReason.includes('paused')) {
    return 'Contract is currently paused for maintenance';
  }

  if (lowerReason.includes('not owner')) {
    return 'This action requires contract owner permissions';
  }

  if (lowerReason.includes('voting duration')) {
    return 'Voting duration must be between 1 day and 30 days';
  }

  if (lowerReason.includes('content hash')) {
    return 'Invalid proposal content hash';
  }

  return undefined;
}

/**
 * Format error for toast notification
 * @param error ParsedError object
 * @returns Formatted message for display
 */
export function formatErrorForToast(error: ParsedError): string {
  if (error.suggestion) {
    return `${error.message}. ${error.suggestion}`;
  }
  return error.message;
}

/**
 * Check if error is retryable
 * @param error ParsedError object
 * @returns true if error might resolve on retry
 */
export function isRetryableError(error: ParsedError): boolean {
  const retryableCodes = ['NETWORK_ERROR', 'GAS_ESTIMATION_FAILED'];
  return error.code ? retryableCodes.includes(error.code) : false;
}
