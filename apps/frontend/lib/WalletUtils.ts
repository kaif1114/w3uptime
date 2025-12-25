import { isAddress } from "ethers";

/**
 * Format an Ethereum wallet address to a shortened display format
 * @param address - Full Ethereum address (0x...)
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Formatted address like "0x1234...5678" or original if invalid
 */
export function formatWalletAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address || typeof address !== "string") {
    return "";
  }

  // Validate it's a proper Ethereum address
  if (!isValidEthereumAddress(address)) {
    return address; // Return as-is if not valid
  }

  // If address is shorter than the combined chars, return as-is
  if (address.length <= startChars + endChars) {
    return address;
  }

  const start = address.slice(0, startChars);
  const end = address.slice(-endChars);
  return `${start}...${end}`;
}

/**
 * Copy text to clipboard using the Clipboard API
 * @param text - Text to copy to clipboard
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text || typeof text !== "string") {
    console.error("copyToClipboard: Invalid text provided");
    return false;
  }

  try {
    // Check if clipboard API is available
    if (!navigator?.clipboard) {
      console.error("Clipboard API not available");
      return false;
    }

    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * Validate if a string is a valid Ethereum address
 * @param address - Address to validate
 * @returns boolean - true if valid Ethereum address
 */
export function isValidEthereumAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  // Use ethers.js isAddress function for validation
  return isAddress(address);
}
