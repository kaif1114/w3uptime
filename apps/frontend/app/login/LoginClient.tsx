"use client";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authenticateWallet, connectWallet } from "@/lib/auth-client";

function LoginClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  if (isSessionLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Checking authentication...</span>
      </div>
    );
  }

  async function handleLogin() {
    const verifyData = await connectWallet();
    if (verifyData) {
      queryClient.setQueryData(["session"], verifyData);
      router.push("/monitors");
    }
  }

  return (
    <>
      <Button
        onClick={handleLogin}
      >
        Login with MetaMask
      </Button>
    </>
  );
}

export default LoginClient;
