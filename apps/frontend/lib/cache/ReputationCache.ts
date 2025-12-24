import NodeCache from 'node-cache';
import { getOnChainReputationBalance } from '../contracts/ReputationContract';

const cache = new NodeCache({ stdTTL: 10 }); // 10 seconds - reduced for faster updates after claims

export async function getCachedOnChainBalance(
  walletAddress: string
): Promise<bigint | null> {
  const cacheKey = `onchain_${walletAddress}`;

  const cached = cache.get<string>(cacheKey);
  if (cached !== undefined) {
    return BigInt(cached);
  }

  try {
    const balance = await getOnChainReputationBalance(walletAddress);
    cache.set(cacheKey, balance.toString());
    return balance;
  } catch (error) {
    return null; // Return null when contract unavailable
  }
}
