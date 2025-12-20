import { Contract, parseUnits } from 'ethers';

export interface GasEstimate {
  gasLimit: bigint;
  maxFeePerGas: bigint;
  estimatedCost: bigint;
  estimatedCostEth: number;
}

/**
 * Estimate gas cost for creating a proposal on-chain
 * @param contract W3Governance contract instance
 * @param contentHash keccak256 hash of proposal content
 * @param votingDuration Voting period in seconds
 * @returns Gas estimation details including cost in ETH
 */
export async function estimateProposalCreationGas(
  contract: Contract,
  contentHash: string,
  votingDuration: number
): Promise<GasEstimate> {
  try {
    const gasEstimate = await contract.createProposal.estimateGas(
      contentHash,
      votingDuration
    );
    const gasPrice = await contract.runner!.provider!.getFeeData();

    const maxFeePerGas = gasPrice.maxFeePerGas || parseUnits('50', 'gwei');
    const estimatedCost = gasEstimate * maxFeePerGas;

    return {
      gasLimit: gasEstimate,
      maxFeePerGas,
      estimatedCost,
      estimatedCostEth: Number(estimatedCost) / 1e18,
    };
  } catch (error) {
    console.error('Gas estimation failed:', error);
    // Return fallback values
    return {
      gasLimit: BigInt(150000),
      maxFeePerGas: parseUnits('50', 'gwei'),
      estimatedCost: parseUnits('0.0075', 'ether'),
      estimatedCostEth: 0.0075,
    };
  }
}

/**
 * Estimate gas cost for voting on a proposal
 * @param contract W3Governance contract instance
 * @param proposalId On-chain proposal ID
 * @param support true for upvote, false for downvote
 * @returns Gas estimation with 20% buffer
 */
export async function estimateVoteGas(
  contract: Contract,
  proposalId: number,
  support: boolean
): Promise<GasEstimate> {
  try {
    const gasEstimate = await contract.vote.estimateGas(proposalId, support);

    const gasPrice = await contract.runner!.provider!.getFeeData();
    const maxFeePerGas = gasPrice.maxFeePerGas || parseUnits('50', 'gwei');
    const estimatedCost = gasEstimate * maxFeePerGas;

    return {
      gasLimit: (gasEstimate * BigInt(120)) / BigInt(100), // Add 20% buffer
      maxFeePerGas,
      estimatedCost,
      estimatedCostEth: Number(estimatedCost) / 1e18,
    };
  } catch (error) {
    console.error('Gas estimation failed:', error);
    // Fallback gas estimate for voting
    const gasLimit = BigInt(80000); // Typical vote gas cost
    const maxFeePerGas = parseUnits('50', 'gwei');
    return {
      gasLimit,
      maxFeePerGas,
      estimatedCost: gasLimit * maxFeePerGas,
      estimatedCostEth: Number(gasLimit * maxFeePerGas) / 1e18,
    };
  }
}

/**
 * Estimate gas cost for finalizing a proposal
 * @param contract W3Governance contract instance
 * @param proposalId On-chain proposal ID
 * @returns Gas estimation with 20% buffer
 */
export async function estimateFinalizationGas(
  contract: Contract,
  proposalId: number
): Promise<GasEstimate> {
  try {
    const gasEstimate = await contract.finalizeProposal.estimateGas(proposalId);

    const gasPrice = await contract.runner!.provider!.getFeeData();
    const maxFeePerGas = gasPrice.maxFeePerGas || parseUnits('50', 'gwei');
    const estimatedCost = gasEstimate * maxFeePerGas;

    return {
      gasLimit: (gasEstimate * BigInt(120)) / BigInt(100), // Add 20% buffer
      maxFeePerGas,
      estimatedCost,
      estimatedCostEth: Number(estimatedCost) / 1e18,
    };
  } catch (error) {
    console.error('Gas estimation failed:', error);
    const gasLimit = BigInt(150000);
    const maxFeePerGas = parseUnits('50', 'gwei');
    return {
      gasLimit,
      maxFeePerGas,
      estimatedCost: gasLimit * maxFeePerGas,
      estimatedCostEth: Number(gasLimit * maxFeePerGas) / 1e18,
    };
  }
}

/**
 * Format gas cost for display
 * @param costEth Cost in ETH
 * @returns Formatted string (e.g., "~0.0008 ETH")
 */
export function formatGasCost(costEth: number): string {
  if (costEth < 0.0001) {
    return '<0.0001 ETH';
  }
  return `~${costEth.toFixed(4)} ETH`;
}

/**
 * Check if wallet has sufficient balance for gas
 * @param walletBalance Balance in wei
 * @param gasEstimate Gas estimate object
 * @returns true if sufficient balance
 */
export function hasSufficientGasBalance(
  walletBalance: bigint,
  gasEstimate: GasEstimate
): boolean {
  return walletBalance >= gasEstimate.estimatedCost;
}
