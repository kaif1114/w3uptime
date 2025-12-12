import { Wallet } from 'ethers';

console.log('Generating new Ethereum wallet for platform finalization...\n');

// Generate new random wallet
const wallet = Wallet.createRandom();

console.log('✅ Platform Wallet Generated Successfully!\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('Address:', wallet.address);
console.log('═══════════════════════════════════════════════════════════');
console.log('Private Key:', wallet.privateKey);
console.log('═══════════════════════════════════════════════════════════');
console.log('Mnemonic Phrase:', wallet.mnemonic?.phrase);
console.log('═══════════════════════════════════════════════════════════\n');

console.log('⚠️  IMPORTANT SECURITY INSTRUCTIONS:');
console.log('');
console.log('1. Save the mnemonic phrase in a SECURE location (password manager, hardware wallet)');
console.log('2. Add the following to your .env file:');
console.log('');
console.log('   PLATFORM_SIGNER_PRIVATE_KEY=' + wallet.privateKey);
console.log('   PLATFORM_SIGNER_ADDRESS=' + wallet.address);
console.log('');
console.log('3. NEVER commit the .env file to git');
console.log('4. Verify .env is in .gitignore');
console.log('5. Fund the wallet with Sepolia ETH from: https://sepoliafaucet.com/');
console.log('6. Check balance after funding: npm run check-wallet-balance');
console.log('');
console.log('📖 For complete setup instructions, see: docs/platform-wallet-setup.md');
console.log('');
