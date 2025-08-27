import { ethers } from "ethers";

export function verifyMessage(
  signature: string,
  message: string,
  publicKey: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    const publicKeyAddress = ethers.computeAddress(publicKey);
    return recoveredAddress.toLowerCase() === publicKeyAddress.toLowerCase();
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}