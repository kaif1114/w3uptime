import { ethers } from 'ethers';
import * as crypto from 'crypto';
import { KeystoreManager, DecryptedWallet } from './keystore';

export interface SignedMessage {
  signature: string;
  message: string;
  timestamp: number;
  nonce: string;
  publicKey: string;
}

export interface MessageToSign {
  [key: string]: any;
}

export class SecureMessageSigner {
  private wallet: DecryptedWallet | null = null;
  private ethersWallet: ethers.Wallet | null = null;
  private sessionTimeout: number;
  private sessionTimer: NodeJS.Timeout | null = null;
  private keystoreManager: KeystoreManager;

  constructor(sessionTimeoutMinutes: number = 30, keystoreDir?: string) {
    this.sessionTimeout = sessionTimeoutMinutes * 60 * 1000; // Convert to milliseconds
    this.keystoreManager = new KeystoreManager(keystoreDir);
  }

  /**
   * Authenticate with keystore and password
   */
  async authenticate(keystorePath: string, password: string): Promise<void> {
    try {
      this.wallet = await this.keystoreManager.loadWallet(keystorePath, password);
      this.ethersWallet = new ethers.Wallet(this.wallet.privateKey);
      
      // Start session timer
      this.startSessionTimer();
      
      console.log(`Authenticated with wallet: ${this.wallet.address}`);
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.wallet !== null && this.ethersWallet !== null;
  }

  /**
   * Get the current wallet address
   */
  getAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Get the current wallet public key
   */
  getPublicKey(): string | null {
    return this.wallet?.publicKey || null;
  }

  /**
   * Sign a message with timestamp and nonce for replay attack prevention
   */
  async signMessage(messageData: MessageToSign): Promise<SignedMessage> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please authenticate first.');
    }

    // Generate nonce and timestamp
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');

    // Create the message with anti-replay protection
    const messageWithSecurity = {
      ...messageData,
      timestamp,
      nonce,
      publicKey: this.wallet!.publicKey
    };

    const messageString = JSON.stringify(messageWithSecurity);

    try {
      // Sign the message using ethers
      const signature = await this.ethersWallet!.signMessage(messageString);

      return {
        signature,
        message: messageString,
        timestamp,
        nonce,
        publicKey: this.wallet!.publicKey
      };
    } catch (error) {
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }

  /**
   * Verify a signed message (useful for testing)
   */
  static verifySignature(signedMessage: SignedMessage): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(signedMessage.message, signedMessage.signature);
      const publicKeyAddress = ethers.computeAddress(signedMessage.publicKey);
      
      return recoveredAddress.toLowerCase() === publicKeyAddress.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  /**
   * Lock the session (clear sensitive data from memory)
   */
  lock(): void {
    this.clearSession();
    console.log('Session locked');
  }

  /**
   * Extend the current session
   */
  extendSession(): void {
    if (this.isAuthenticated()) {
      this.startSessionTimer();
      console.log('Session extended');
    }
  }

  /**
   * Get remaining session time in minutes
   */
  getSessionTimeRemaining(): number {
    if (!this.sessionTimer) {
      return 0;
    }
    
    // This is a simplified version - in practice you'd track the exact expiry time
    return Math.round(this.sessionTimeout / 60000);
  }

  /**
   * Start or restart the session timeout timer
   */
  private startSessionTimer(): void {
    // Clear existing timer
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    // Set new timer
    this.sessionTimer = setTimeout(() => {
      console.log('Session expired due to timeout');
      this.clearSession();
    }, this.sessionTimeout);
  }

  /**
   * Clear session data from memory
   */
  private clearSession(): void {
    // Clear sensitive data
    if (this.wallet) {
      // Overwrite private key in memory with zeros (best effort)
      if (this.wallet.privateKey) {
        const privateKeyLength = this.wallet.privateKey.length;
        this.wallet.privateKey = '0'.repeat(privateKeyLength);
      }
      this.wallet = null;
    }

    this.ethersWallet = null;

    // Clear timer
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Cleanup when shutting down
   */
  destroy(): void {
    this.clearSession();
  }
}

export class ParanoidMessageSigner extends SecureMessageSigner {
  /**
   * Paranoid mode requires password for each signing operation
   */
  async signMessageWithPassword(
    messageData: MessageToSign, 
    keystorePath: string, 
    password: string
  ): Promise<SignedMessage> {
    // Temporarily authenticate
    await this.authenticate(keystorePath, password);
    
    try {
      const signedMessage = await this.signMessage(messageData);
      return signedMessage;
    } finally {
      // Immediately clear session after signing
      this.lock();
    }
  }
}

/**
 * Utility functions for message signing
 */
export class SigningUtils {
  /**
   * Create a message hash for verification
   */
  static hashMessage(message: string): string {
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  /**
   * Validate message timestamp (check if not too old or from future)
   */
  static validateMessageTimestamp(timestamp: number, maxAgeMinutes: number = 5): boolean {
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;
    const futureThreshold = 60 * 1000; // 1 minute in future allowed for clock skew
    
    return (
      timestamp <= (now + futureThreshold) && 
      timestamp >= (now - maxAge)
    );
  }

  /**
   * Extract public key from signed message
   */
  static recoverPublicKey(message: string, signature: string): string {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      // Note: This returns the address, not the public key
      // To get the actual public key, we'd need additional information
      return recoveredAddress;
    } catch (error) {
      throw new Error('Failed to recover public key from signature');
    }
  }
}