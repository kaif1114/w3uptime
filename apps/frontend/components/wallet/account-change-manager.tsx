"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { useMetaMaskAccountChange } from "@/hooks/useMetaMaskAccountChange";
import { AccountMismatchAlert } from "@/components/ui/AccountMismatchAlert";
import { logout } from "@/lib/auth";

interface MismatchState {
  isOpen: boolean;
  detectedAddress: string;
}

/**
 * Global component that manages MetaMask account change detection
 * Shows alert dialog when user switches to a different account
 * Shows toast notification when MetaMask is locked
 */
export function AccountChangeManager() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mismatchState, setMismatchState] = useState<MismatchState>({
    isOpen: false,
    detectedAddress: "",
  });

  const handleAccountChange = (newAddress: string) => {
    // Case 1: MetaMask is locked (empty address)
    if (newAddress === "") {
      toast.warning("MetaMask wallet locked. Please unlock to continue.");
      return;
    }

    // Case 2: Account switched to a different address
    if (session?.user?.walletAddress) {
      setMismatchState({
        isOpen: true,
        detectedAddress: newAddress,
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to log out. Please try again.");
    }
  };

  const handleCancel = () => {
    setMismatchState({
      isOpen: false,
      detectedAddress: "",
    });
  };

  // Setup MetaMask account change listener
  useMetaMaskAccountChange(session?.user?.walletAddress, handleAccountChange);

  return (
    <AccountMismatchAlert
      isOpen={mismatchState.isOpen}
      sessionAddress={session?.user?.walletAddress || ""}
      detectedAddress={mismatchState.detectedAddress}
      onLogout={handleLogout}
      onCancel={handleCancel}
    />
  );
}
