import { keccak256, toUtf8Bytes } from 'ethers';

/**
 * Generate keccak256 hash of proposal content for on-chain storage
 * 
 * This hash is used to verify that the proposal content stored in the database
 * matches what was submitted to the blockchain. It provides cryptographic proof
 * that the proposal has not been tampered with.
 * 
 * @param title - Proposal title
 * @param description - Proposal description
 * @returns 0x-prefixed hex string hash (bytes32)
 * 
 * @example
 * ```typescript
 * const hash = generateContentHash(
 *   "Add Dark Mode",
 *   "Implement dark mode theme across the platform"
 * );
 * // Returns: "0x1234567890abcdef..."
 * ```
 * 
 * @throws {Error} If title or description is empty
 */
export function generateContentHash(title: string, description: string): string {
  if (!title?.trim() || !description?.trim()) {
    throw new Error('Title and description cannot be empty');
  }
  
  // Use separator to prevent collision between different title/description combinations
  // e.g., "AB" + "CD" vs "ABC" + "D" would produce different hashes
  const content = `${title}|||${description}`;
  const contentBytes = toUtf8Bytes(content);
  return keccak256(contentBytes);
}

/**
 * Verify that proposal content matches a given hash
 * 
 * This is used to verify that proposal data retrieved from the database
 * matches what was originally hashed and stored on the blockchain.
 * 
 * @param title - Proposal title to verify
 * @param description - Proposal description to verify
 * @param hash - Expected content hash (from blockchain)
 * @returns true if content matches hash, false otherwise
 * 
 * @example
 * ```typescript
 * const isValid = verifyContentHash(
 *   "Add Dark Mode",
 *   "Implement dark mode theme",
 *   "0x1234567890abcdef..."
 * );
 * // Returns: true or false
 * ```
 */
export function verifyContentHash(
  title: string, 
  description: string, 
  hash: string
): boolean {
  try {
    return generateContentHash(title, description) === hash;
  } catch {
    return false;
  }
}

/**
 * Validate that a hash string is a valid bytes32 hex string
 * 
 * @param hash - Hash string to validate
 * @returns true if valid bytes32 format (0x + 64 hex chars)
 * 
 * @example
 * ```typescript
 * isValidContentHash("0x1234..."); // true if 66 chars (0x + 64 hex)
 * isValidContentHash("invalid");    // false
 * ```
 */
export function isValidContentHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  
  // bytes32 should be 0x followed by 64 hexadecimal characters
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}
