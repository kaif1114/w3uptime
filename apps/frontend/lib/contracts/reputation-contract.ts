import { ethers, JsonRpcProvider, Contract } from 'ethers';

const W3GOVERNANCE_ABI = [
  'function reputationPoints(address user) external view returns (uint256)'
];

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT_ADDRESS!;
const RPC_URL = process.env.ETHEREUM_RPC_URL!;

let provider: JsonRpcProvider | null = null;
let contract: Contract | null = null;

function getContract(): Contract {
  if (!provider) {
    provider = new JsonRpcProvider(RPC_URL);
  }
  if (!contract) {
    contract = new Contract(CONTRACT_ADDRESS, W3GOVERNANCE_ABI, provider);
  }
  return contract;
}

export async function getOnChainReputationBalance(
  walletAddress: string
): Promise<bigint> {
  try {
    const contract = getContract();
    const balance: bigint = await contract.reputationPoints(walletAddress);
    return balance;
  } catch (error) {
    console.error('Failed to fetch on-chain reputation:', error);
    throw new Error('Contract unavailable');
  }
}
