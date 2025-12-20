"use client";

import { useEffect, useRef } from "react";

/**
 * Custom hook to detect MetaMask account changes
 * Listens for the 'accountsChanged' event from MetaMask
 *
 * @param currentAddress - The current wallet address from the session
 * @param onAccountChange - Callback function called when account changes
 *                          - Called with new address when user switches accounts
 *                          - Called with empty string when MetaMask is locked
 */
export function useMetaMaskAccountChange(
  currentAddress: string | undefined,
  onAccountChange: (newAddress: string) => void
): void {
  // Use ref to avoid recreating the handler on every render
  const onAccountChangeRef = useRef(onAccountChange);

  // Update ref when callback changes
  useEffect(() => {
    onAccountChangeRef.current = onAccountChange;
  }, [onAccountChange]);

  useEffect(() => {
    // Check if MetaMask is installed
    if (typeof window === "undefined" || !window.ethereum) {
      console.warn("MetaMask not detected");
      return;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      console.log("MetaMask accounts changed:", accounts);

      // Empty array means MetaMask is locked
      if (accounts.length === 0) {
        console.log("MetaMask is locked");
        onAccountChangeRef.current("");
        return;
      }

      // Get the new selected account (always first in array)
      const newAddress = accounts[0]?.toLowerCase();

      // Compare with current session address (case-insensitive)
      if (currentAddress && newAddress !== currentAddress.toLowerCase()) {
        console.log("Account switched:", {
          from: currentAddress,
          to: newAddress,
        });
        onAccountChangeRef.current(newAddress);
      }
    };

    // Add event listener
    if (window.ethereum?.on) {
      window.ethereum.on("accountsChanged", handleAccountsChanged as (...args: unknown[]) => void);
    }

    // Cleanup: Remove listener on unmount
    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged as (...args: unknown[]) => void
        );
      }
    };
  }, [currentAddress]);
}
