import { ethers } from "ethers";

export interface AuthResult {
  authenticated: boolean;
  user: any | null;
  session: any | null;
  error: string | null;
}

export const connectWallet = async (): Promise<AuthResult | undefined> => {
  try {
    if (!window?.ethereum) {
      throw new Error("Please install MetaMask to continue!");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts: string[] = await provider.send("eth_requestAccounts", []);

    if (accounts.length === 0) {
      throw new Error("No wallet accounts found. Please connect your wallet.");
    }

    const walletAddress = accounts[0];

    return await authenticateWallet(walletAddress, provider);
  } catch (error) {
    console.error("Wallet connection error:", error);
  }
};

export const authenticateWallet = async (
  walletAddress: string,
  provider: ethers.BrowserProvider
) => {
  try {
    const nonceResponse = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ walletAddress }),
    });

    const nonceData = await nonceResponse.json();

    if (!nonceData.success) {
      throw new Error(nonceData.error || "Failed to get nonce");
    }

    const { nonce } = nonceData;

    const signer = await provider.getSigner();
    const signature = await signer.signMessage(nonce);

    const verifyResponse = await fetch("/api/auth/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        walletAddress,
        signature,
      }),
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      throw new Error(verifyData.error || "Authentication failed");
    }

    return verifyData;
  } catch (error) {
    console.error("Authentication error:", error);
  }
};

export const logout = async () => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout error:", error);
  }
};
