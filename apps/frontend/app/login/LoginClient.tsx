"use client";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function LoginClient() {
  const router = useRouter();
  const {
    data: session,
    isLoading: isSessionLoading,
    isError: isSessionError,
  } = useSession();

  useEffect(() => {
    if (session?.authenticated) {
      router.push("/monitors");
    }
  }, [session, router]);

  const connectWallet = async () => {
    try {
      if (!window?.ethereum) {
        throw new Error("Please install MetaMask to continue!");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts: string[] = await provider.send("eth_requestAccounts", []);

      if (accounts.length === 0) {
        throw new Error(
          "No wallet accounts found. Please connect your wallet."
        );
      }

      const walletAddress = accounts[0];

      await authenticateWallet(walletAddress, provider);
    } catch (error) {
      console.error("Wallet connection error:", error);
    }
  };

  const authenticateWallet = async (
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

      router.push("/monitors");
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isSessionLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Checking authentication...</span>
      </div>
    );
  }

  return (
    <><Button onClick={connectWallet}>Login with MetaMask</Button></>
  );
}

export default LoginClient;
