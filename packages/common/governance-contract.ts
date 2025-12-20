/**
 * W3Governance Smart Contract Integration
 *
 * This module provides TypeScript helpers for interacting with the W3Governance
 * contract deployed on Sepolia testnet.
 *
 * Features:
 * - Contract instance creation with ethers.js v6
 * - Helper functions for reading proposal data
 * - Event listener setup for ProposalCreated, VoteCast, ProposalFinalized
 * - Type-safe contract interactions
 */

import { Contract, Provider, Signer, BaseContract, ContractTransactionResponse, Overrides } from 'ethers';
import type { OnChainProposal, VoteCastEvent, ProposalFinalizedEvent } from './governance-types';
import { convertContractToProposal } from './governance-types';
import GOVERNANCE_ABI from './governance-abi.json';

/**
 * W3Governance contract address on Sepolia testnet
 * Deployed at block 9825346
 */
export const GOVERNANCE_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT_ADDRESS!

/**
 * Sepolia testnet chain ID
 */
export const SEPOLIA_CHAIN_ID = 11155111;

/**
 * Contract ABI for W3Governance
 * Exported from Remix IDE compilation
 */
export const GOVERNANCE_CONTRACT_ABI = GOVERNANCE_ABI;

/**
 * Typed interface for W3Governance smart contract
 *
 * Extends BaseContract with type-safe method signatures following ethers.js v6 best practices.
 * Uses the getFunction() pattern for accessing contract methods with proper typing.
 *
 * @example Read Operations
 * ```typescript
 * const contract = createGovernanceContract(provider);
 * const getProposalFn = contract.getFunction("getProposal");
 * const proposal = await getProposalFn(1);
 * ```
 *
 * @example Write Operations with Gas Estimation
 * ```typescript
 * const contract = createGovernanceContractWithSigner(signer);
 * const voteFn = contract.getFunction("vote");
 * const gasEstimate = await voteFn.estimateGas(1, true);
 * const tx = await voteFn(1, true);
 * await tx.wait();
 * ```
 */
export interface W3GovernanceContract extends BaseContract {
  // Write methods (transactions)
  getFunction(name: "createProposal"): {
    (contentHash: string, votingDuration: number, overrides?: Overrides): Promise<ContractTransactionResponse>;
    estimateGas(contentHash: string, votingDuration: number, overrides?: Overrides): Promise<bigint>;
  };

  getFunction(name: "vote"): {
    (proposalId: number, support: boolean, overrides?: Overrides): Promise<ContractTransactionResponse>;
    estimateGas(proposalId: number, support: boolean, overrides?: Overrides): Promise<bigint>;
  };

  getFunction(name: "finalizeProposal"): {
    (proposalId: number, overrides?: Overrides): Promise<ContractTransactionResponse>;
    estimateGas(proposalId: number, overrides?: Overrides): Promise<bigint>;
  };

  // Read methods
  getFunction(name: "getProposal"): (proposalId: number) => Promise<{
    proposer: string;
    contentHash: string;
    votingEndsAt: bigint;
    upvotes: bigint;
    downvotes: bigint;
    finalized: boolean;
    passed: boolean;
  }>;

  getFunction(name: "getVote"): (proposalId: number, voter: string) => Promise<[boolean, boolean]>;

  getFunction(name: "getVoteCounts"): (proposalId: number) => Promise<[bigint, bigint, bigint]>;

  getFunction(name: "isVotingActive"): (proposalId: number) => Promise<boolean>;

  getFunction(name: "proposalCount"): () => Promise<bigint>;

  getFunction(name: "MIN_VOTING_DURATION"): () => Promise<bigint>;

  getFunction(name: "MAX_VOTING_DURATION"): () => Promise<bigint>;
}

/**
 * Create a read-only W3Governance contract instance
 *
 * @param provider - Ethers.js Provider (e.g., AlchemyProvider, JsonRpcProvider)
 * @returns Contract instance for read operations
 *
 * @example
 * ```typescript
 * import { createGovernanceContract } from 'common/governance-contract';
 * import { AlchemyProvider } from 'ethers';
 *
 * const provider = new AlchemyProvider('sepolia', process.env.ALCHEMY_API_KEY);
 * const contract = createGovernanceContract(provider);
 *
 * // Read proposal data
 * const proposal = await contract.getProposal(1);
 * console.log(proposal);
 * ```
 */
export function createGovernanceContract(provider: Provider): W3GovernanceContract {
  return new Contract(GOVERNANCE_CONTRACT_ADDRESS, GOVERNANCE_CONTRACT_ABI, provider) as W3GovernanceContract;
}

/**
 * Create a writable W3Governance contract instance with signer
 *
 * Used for sending transactions (createProposal, vote, finalizeProposal)
 *
 * @param signer - Ethers.js Signer (e.g., from MetaMask via BrowserProvider)
 * @returns Contract instance for write operations
 *
 * @example
 * ```typescript
 * import { createGovernanceContractWithSigner } from 'common/governance-contract';
 * import { BrowserProvider } from 'ethers';
 *
 * const provider = new BrowserProvider(window.ethereum);
 * const signer = await provider.getSigner();
 * const contract = createGovernanceContractWithSigner(signer);
 *
 * // Vote on proposal
 * const tx = await contract.vote(1, true); // proposalId=1, support=true
 * await tx.wait();
 * ```
 */
export function createGovernanceContractWithSigner(signer: Signer): W3GovernanceContract {
  return new Contract(GOVERNANCE_CONTRACT_ADDRESS, GOVERNANCE_CONTRACT_ABI, signer) as W3GovernanceContract;
}

/**
 * Fetch proposal data from blockchain
 *
 * @param proposalId - On-chain proposal ID
 * @param provider - Ethers.js Provider
 * @returns Typed OnChainProposal object
 *
 * @throws Error if proposal doesn't exist or network error
 *
 * @example
 * ```typescript
 * const proposal = await getProposalFromChain(1, provider);
 * console.log(`Upvotes: ${proposal.upvotes}, Downvotes: ${proposal.downvotes}`);
 * ```
 */
export async function getProposalFromChain(
  proposalId: number,
  provider: Provider
): Promise<OnChainProposal> {
  const contract = createGovernanceContract(provider);
  const getProposalFn = contract.getFunction("getProposal");
  const rawData = await getProposalFn(proposalId);
  return convertContractToProposal(rawData);
}

/**
 * Check if a specific address has voted on a proposal
 *
 * @param proposalId - On-chain proposal ID
 * @param voter - Ethereum address to check
 * @param provider - Ethers.js Provider
 * @returns Object with hasVoted boolean and support direction
 *
 * @example
 * ```typescript
 * const voteStatus = await getVoteStatus(1, '0x123...', provider);
 * if (voteStatus.hasVoted) {
 *   console.log(`Voted: ${voteStatus.support ? 'UPVOTE' : 'DOWNVOTE'}`);
 * }
 * ```
 */
export async function getVoteStatus(
  proposalId: number,
  voter: string,
  provider: Provider
): Promise<{ hasVoted: boolean; support: boolean }> {
  const contract = createGovernanceContract(provider);
  const getVoteFn = contract.getFunction("getVote");
  const [hasVoted, support] = await getVoteFn(proposalId, voter);
  return { hasVoted, support };
}

/**
 * Get vote counts for a proposal
 *
 * @param proposalId - On-chain proposal ID
 * @param provider - Ethers.js Provider
 * @returns Object with upvotes, downvotes, and total
 *
 * @example
 * ```typescript
 * const counts = await getVoteCounts(1, provider);
 * console.log(`${counts.upvotes} upvotes, ${counts.downvotes} downvotes`);
 * ```
 */
export async function getVoteCounts(
  proposalId: number,
  provider: Provider
): Promise<{ upvotes: bigint; downvotes: bigint; total: bigint }> {
  const contract = createGovernanceContract(provider);
  const getVoteCountsFn = contract.getFunction("getVoteCounts");
  const [upvotes, downvotes, total] = await getVoteCountsFn(proposalId);
  return { upvotes, downvotes, total };
}

/**
 * Check if voting is currently active for a proposal
 *
 * @param proposalId - On-chain proposal ID
 * @param provider - Ethers.js Provider
 * @returns true if voting is active (not ended and not finalized)
 *
 * @example
 * ```typescript
 * const isActive = await isVotingActive(1, provider);
 * if (isActive) {
 *   console.log('You can still vote on this proposal');
 * }
 * ```
 */
export async function isVotingActive(
  proposalId: number,
  provider: Provider
): Promise<boolean> {
  const contract = createGovernanceContract(provider);
  const isVotingActiveFn = contract.getFunction("isVotingActive");
  return await isVotingActiveFn(proposalId);
}

/**
 * Event listener type for ProposalCreated events
 */
export type ProposalCreatedListener = (
  proposalId: bigint,
  proposer: string,
  contentHash: string,
  votingEndsAt: bigint,
  timestamp: bigint,
  event: any
) => void | Promise<void>;

/**
 * Event listener type for VoteCast events
 */
export type VoteCastListener = (
  proposalId: bigint,
  voter: string,
  support: boolean,
  timestamp: bigint,
  event: any
) => void | Promise<void>;

/**
 * Event listener type for ProposalFinalized events
 */
export type ProposalFinalizedListener = (
  proposalId: bigint,
  upvotes: bigint,
  downvotes: bigint,
  passed: boolean,
  timestamp: bigint,
  event: any
) => void | Promise<void>;

/**
 * Setup listener for ProposalCreated events
 *
 * @param provider - Ethers.js Provider (should be WebSocketProvider for real-time)
 * @param callback - Function to call when event is emitted
 * @returns Cleanup function to remove listener
 *
 * @example
 * ```typescript
 * const cleanup = listenForProposalCreated(provider, async (proposalId, proposer, contentHash) => {
 *   console.log(`New proposal ${proposalId} created by ${proposer}`);
 *   // Update database, send notification, etc.
 * });
 *
 * // Later: cleanup() to remove listener
 * ```
 */
export function listenForProposalCreated(
  provider: Provider,
  callback: ProposalCreatedListener
): () => void {
  const contract = createGovernanceContract(provider);

  contract.on('ProposalCreated', callback);

  // Return cleanup function
  return () => {
    contract.off('ProposalCreated', callback);
  };
}

/**
 * Setup listener for VoteCast events
 *
 * @param provider - Ethers.js Provider (should be WebSocketProvider for real-time)
 * @param callback - Function to call when vote is cast
 * @returns Cleanup function to remove listener
 *
 * @example
 * ```typescript
 * const cleanup = listenForVoteCast(provider, async (proposalId, voter, support) => {
 *   console.log(`Vote on proposal ${proposalId}: ${support ? 'UPVOTE' : 'DOWNVOTE'}`);
 *   // Cache vote in database
 * });
 * ```
 */
export function listenForVoteCast(
  provider: Provider,
  callback: VoteCastListener
): () => void {
  const contract = createGovernanceContract(provider);

  contract.on('VoteCast', callback);

  return () => {
    contract.off('VoteCast', callback);
  };
}

/**
 * Setup listener for ProposalFinalized events
 *
 * @param provider - Ethers.js Provider
 * @param callback - Function to call when proposal is finalized
 * @returns Cleanup function to remove listener
 *
 * @example
 * ```typescript
 * const cleanup = listenForProposalFinalized(provider, async (proposalId, upvotes, downvotes, passed) => {
 *   console.log(`Proposal ${proposalId} finalized: ${passed ? 'PASSED' : 'FAILED'}`);
 *   // Update database with final results
 * });
 * ```
 */
export function listenForProposalFinalized(
  provider: Provider,
  callback: ProposalFinalizedListener
): () => void {
  const contract = createGovernanceContract(provider);

  contract.on('ProposalFinalized', callback);

  return () => {
    contract.off('ProposalFinalized', callback);
  };
}

/**
 * Query past ProposalCreated events
 *
 * @param provider - Ethers.js Provider
 * @param fromBlock - Starting block number (or 'earliest')
 * @param toBlock - Ending block number (or 'latest')
 * @returns Array of event data
 *
 * @example
 * ```typescript
 * // Get all ProposalCreated events from the last 1000 blocks
 * const currentBlock = await provider.getBlockNumber();
 * const events = await queryProposalCreatedEvents(provider, currentBlock - 1000, 'latest');
 * ```
 */
export async function queryProposalCreatedEvents(
  provider: Provider,
  fromBlock: number | string = 'earliest',
  toBlock: number | string = 'latest'
) {
  const contract = createGovernanceContract(provider);
  const filter = contract.filters.ProposalCreated();
  return await contract.queryFilter(filter, fromBlock, toBlock);
}

/**
 * Query past VoteCast events for a specific proposal
 *
 * @param proposalId - On-chain proposal ID to filter by
 * @param provider - Ethers.js Provider
 * @param fromBlock - Starting block number
 * @param toBlock - Ending block number
 * @returns Array of vote events
 *
 * @example
 * ```typescript
 * // Get all votes for proposal 1
 * const voteEvents = await queryVoteCastEvents(1, provider);
 * console.log(`Total votes: ${voteEvents.length}`);
 * ```
 */
export async function queryVoteCastEvents(
  proposalId: number,
  provider: Provider,
  fromBlock: number | string = 'earliest',
  toBlock: number | string = 'latest'
) {
  const contract = createGovernanceContract(provider);
  const filter = contract.filters.VoteCast(proposalId);
  return await contract.queryFilter(filter, fromBlock, toBlock);
}

/**
 * Get contract constants
 *
 * @param provider - Ethers.js Provider
 * @returns Object with MIN_VOTING_DURATION and MAX_VOTING_DURATION
 *
 * @example
 * ```typescript
 * const constants = await getContractConstants(provider);
 * console.log(`Min duration: ${constants.minVotingDuration} seconds`);
 * ```
 */
export async function getContractConstants(provider: Provider): Promise<{
  minVotingDuration: bigint;
  maxVotingDuration: bigint;
}> {
  const contract = createGovernanceContract(provider);
  const getMinDurationFn = contract.getFunction("MIN_VOTING_DURATION");
  const getMaxDurationFn = contract.getFunction("MAX_VOTING_DURATION");
  const [minVotingDuration, maxVotingDuration] = await Promise.all([
    getMinDurationFn(),
    getMaxDurationFn(),
  ]);
  return { minVotingDuration, maxVotingDuration };
}

/**
 * Get total proposal count
 *
 * @param provider - Ethers.js Provider
 * @returns Total number of proposals created
 */
export async function getProposalCount(provider: Provider): Promise<bigint> {
  const contract = createGovernanceContract(provider);
  const proposalCountFn = contract.getFunction("proposalCount");
  return await proposalCountFn();
}
