import { ethers } from 'ethers';
import * as crypto from 'crypto';
import { KeystoreManager, DecryptedWallet } from './keystore.js';

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
  private keystoreManager: KeystoreManager;

  constructor(keystoreDir?: string) {
    this.keystoreManager = new KeystoreManager(keystoreDir);
  }

  
  async authenticate(keystorePath: string, password: string): Promise<void> {
    try {
      this.wallet = await this.keystoreManager.loadWallet(keystorePath, password);
      this.ethersWallet = new ethers.Wallet(this.wallet.privateKey);
      
      
      console.log(`Authenticated with wallet: ${this.wallet.address}`);
    } catch (error) {
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  
  isAuthenticated(): boolean {
    return this.wallet !== null && this.ethersWallet !== null;
  }

  
  getAddress(): string | null {
    return this.wallet?.address || null;
  }

  
  getPublicKey(): string | null {
    return this.wallet?.publicKey || null;
  }

  
  async signMessage(messageData: MessageToSign): Promise<SignedMessage> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please authenticate first.');
    }

    
    const messageString = JSON.stringify(messageData);

    try {
      
      const signature = await this.ethersWallet!.signMessage(messageString);

      return {
        signature,
        message: messageString,
        timestamp: Date.now(), 
        nonce: crypto.randomBytes(16).toString('hex'), 
        publicKey: this.wallet!.publicKey
      };
    } catch (error) {
      throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  
  static verifySignature(signedMessage: SignedMessage): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(signedMessage.message, signedMessage.signature);
      const publicKeyAddress = ethers.computeAddress(signedMessage.publicKey);
      
      return recoveredAddress.toLowerCase() === publicKeyAddress.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  
  lock(): void {
    this.clearSession();
    console.log('Session locked');
  }


  
  private clearSession(): void {
    
    if (this.wallet) {
      
      if (this.wallet.privateKey) {
        const privateKeyLength = this.wallet.privateKey.length;
        this.wallet.privateKey = '0'.repeat(privateKeyLength);
      }
      this.wallet = null;
    }

    this.ethersWallet = null;

    
    if (global.gc) {
      global.gc();
    }
  }

  
  destroy(): void {
    this.clearSession();
  }
}

export class ParanoidMessageSigner extends SecureMessageSigner {
  
  async signMessageWithPassword(
    messageData: MessageToSign, 
    keystorePath: string, 
    password: string
  ): Promise<SignedMessage> {
    
    await this.authenticate(keystorePath, password);
    
    try {
      const signedMessage = await this.signMessage(messageData);
      return signedMessage;
    } finally {
      
      this.lock();
    }
  }
}


export class SigningUtils {
  
  static hashMessage(message: string): string {
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  
  static validateMessageTimestamp(timestamp: number, maxAgeMinutes: number = 5): boolean {
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;
    const futureThreshold = 60 * 1000; 
    
    return (
      timestamp <= (now + futureThreshold) && 
      timestamp >= (now - maxAge)
    );
  }

  
  static recoverPublicKey(message: string, signature: string): string {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      
      return recoveredAddress;
    } catch (error) {
      throw new Error('Failed to recover public key from signature');
    }
  }
}