import { ethers, BrowserProvider, Signer, Contract } from 'ethers';

const W3GOVERNANCE_ABI = [
  'function claimReputation(uint256 amount, uint256 nonce, uint256 expiry, bytes memory signature) external',
  'function reputationPoints(address user) external view returns (uint256)'
];

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT_ADDRESS!;

export function createReputationContractWithSigner(signer: Signer): Contract {
  return new Contract(CONTRACT_ADDRESS, W3GOVERNANCE_ABI, signer);
}

export async function getMetaMaskProvider(): Promise<BrowserProvider> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  return new ethers.BrowserProvider(window.ethereum);
}

export async function connectWallet(): Promise<{ provider: BrowserProvider; signer: Signer; address: string }> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const provider = await getMetaMaskProvider();

  // Request account access
  await window.ethereum.request({ method: 'eth_requestAccounts' });

  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return { provider, signer, address };
}
