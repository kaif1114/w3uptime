import * as crypto from 'crypto';
import fs from 'fs-extra';
import * as path from 'path';
import { ethers } from 'ethers';
import chalk from 'chalk';

export interface KeystoreV3 {
  version: 3;
  id: string;
  address: string;
  publicKey: string;
  crypto: {
    ciphertext: string;
    cipherparams: {
      iv: string;
    };
    cipher: string;
    kdf: string;
    kdfparams: {
      dklen: number;
      salt: string;
      n: number;
      r: number;
      p: number;
    };
    mac: string;
  };
}

export interface DecryptedWallet {
  privateKey: string;
  publicKey: string;
  address: string;
}

export class KeystoreManager {
  private readonly keystoreDir: string;

  constructor(keystoreDir?: string) {
    this.keystoreDir = keystoreDir || path.join(process.cwd(), '.w3uptime', 'keystore');
    this.ensureKeystoreDir();
  }

  private ensureKeystoreDir(): void {
    if (!fs.existsSync(this.keystoreDir)) {
      fs.mkdirSync(this.keystoreDir, { recursive: true });
    }
  }


  /**
   * Import an existing private key and save it to encrypted keystore (public key derived automatically)
   */
  async importWallet(privateKey: string, password: string, walletName?: string): Promise<{ address: string; keystorePath: string }> {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Validate private key and derive public key
    try {
      const wallet = new ethers.Wallet(privateKey);
      console.log(wallet);
      
      // Derive public key from private key
      const derivedPublicKey = wallet.signingKey.publicKey;
      
      console.log(chalk.green(`Derived public key from private key`));
      console.log(chalk.gray(`   Address: ${wallet.address}`));
      console.log(chalk.gray(`   Public Key: ${derivedPublicKey}`));
      
      // Create keystore with derived public key
      const keystore = await this.createKeystore(privateKey, derivedPublicKey, password);
      
      // Save to file
      const filename = walletName ? `${walletName}.json` : `validator-${Date.now()}.json`;
      const keystorePath = path.join(this.keystoreDir, filename);
      
      await fs.writeJson(keystorePath, keystore, { spaces: 2 });
      
      return {
        address: keystore.address,
        keystorePath
      };
    } catch (error) {
      // Preserve the actual error message for debugging
      console.error('Actual error in importWallet:', error);
      throw new Error(`Invalid private key format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load and decrypt a keystore file
   */
  async loadWallet(keystorePath: string, password: string): Promise<DecryptedWallet> {
    if (!fs.existsSync(keystorePath)) {
      throw new Error('Keystore file not found');
    }

    const keystore: KeystoreV3 = await fs.readJson(keystorePath);
    return this.decryptKeystore(keystore, password);
  }

  /**
   * List all available keystore files
   */
  async listWallets(): Promise<Array<{ name: string; address: string; path: string }>> {
    const files = await fs.readdir(this.keystoreDir);
    const keystoreFiles = files.filter(file => file.endsWith('.json'));
    
    const wallets = [];
    for (const file of keystoreFiles) {
      try {
        const keystorePath = path.join(this.keystoreDir, file);
        const keystore: KeystoreV3 = await fs.readJson(keystorePath);
        wallets.push({
          name: file.replace('.json', ''),
          address: keystore.address,
          path: keystorePath
        });
      } catch (error) {
        // Skip invalid keystore files
        continue;
      }
    }
    
    return wallets;
  }

  /**
   * Create encrypted keystore from private key and public key
   */
  private async createKeystore(privateKey: string, publicKey: string, password: string): Promise<KeystoreV3> {
    // Ensure private key is in correct format
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const privateKeyBuffer = Buffer.from(cleanPrivateKey, 'hex');
    
    // Create wallet to get address
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address.toLowerCase();
    
    // Generate salt and IV
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    // KDF parameters (scrypt)
    const kdfParams = {
      dklen: 32,
      salt: salt.toString('hex'),
      n: 16384, // CPU/memory cost parameter (reduced for compatibility)
      r: 8,     // Block size parameter
      p: 1      // Parallelization parameter
    };
    
    // Derive key using scrypt
    const derivedKey = crypto.scryptSync(password, salt, kdfParams.dklen, {
      N: kdfParams.n,
      r: kdfParams.r,
      p: kdfParams.p
    });
    
    // Encrypt private key using AES-128-CTR (compatible with web3 standard)
    const cipher = crypto.createCipheriv('aes-128-ctr', derivedKey.slice(0, 16), iv);
    const ciphertext = Buffer.concat([
      cipher.update(privateKeyBuffer),
      cipher.final()
    ]);
    
    // Calculate MAC
    const mac = crypto.createHash('sha256')
      .update(Buffer.concat([derivedKey.slice(16, 32), ciphertext]))
      .digest('hex');
    
    // Ensure public key is in correct format
    const normalizedPublicKey = publicKey.startsWith('0x') ? publicKey : '0x' + publicKey;

    return {
      version: 3,
      id: crypto.randomUUID(),
      address,
      publicKey: normalizedPublicKey,
      crypto: {
        ciphertext: ciphertext.toString('hex'),
        cipherparams: {
          iv: iv.toString('hex')
        },
        cipher: 'aes-128-ctr',
        kdf: 'scrypt',
        kdfparams: kdfParams,
        mac
      }
    };
  }

  /**
   * Decrypt keystore and return wallet information
   */
  private async decryptKeystore(keystore: KeystoreV3, password: string): Promise<DecryptedWallet> {
    const { crypto: cryptoData } = keystore;
    
    // Derive key using the same parameters
    const salt = Buffer.from(cryptoData.kdfparams.salt, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, cryptoData.kdfparams.dklen, {
      N: cryptoData.kdfparams.n,
      r: cryptoData.kdfparams.r,
      p: cryptoData.kdfparams.p
    });
    
    // Verify MAC
    const ciphertext = Buffer.from(cryptoData.ciphertext, 'hex');
    const calculatedMac = crypto.createHash('sha256')
      .update(Buffer.concat([derivedKey.slice(16, 32), ciphertext]))
      .digest('hex');
    
    if (calculatedMac !== cryptoData.mac) {
      throw new Error('Invalid password or corrupted keystore');
    }
    
    // Decrypt private key
    const iv = Buffer.from(cryptoData.cipherparams.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-128-ctr', derivedKey.slice(0, 16), iv);
    const privateKeyBuffer = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    
    const privateKey = '0x' + privateKeyBuffer.toString('hex');
    
    // Create wallet to get public key and verify address
    const wallet = new ethers.Wallet(privateKey);
    
    if (wallet.address.toLowerCase() !== keystore.address.toLowerCase()) {
      throw new Error('Address mismatch - keystore may be corrupted');
    }
    
    return {
      privateKey,
      publicKey: keystore.publicKey, // Use the stored public key
      address: wallet.address
    };
  }

  /**
   * Check if a keystore file exists
   */
  keystoreExists(walletName: string): boolean {
    const keystorePath = path.join(this.keystoreDir, `${walletName}.json`);
    return fs.existsSync(keystorePath);
  }

  /**
   * Get keystore path for a wallet name
   */
  getKeystorePath(walletName: string): string {
    return path.join(this.keystoreDir, `${walletName}.json`);
  }
}