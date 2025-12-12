import { JsonRpcProvider } from 'ethers';

async function checkBalance() {
  const rpcUrl = process.env.ETHEREUM_RPC_URL;
  const platformAddress = process.env.PLATFORM_SIGNER_ADDRESS;

  if (!rpcUrl) {
    console.error('❌ ETHEREUM_RPC_URL not configured in .env');
    process.exit(1);
  }

  if (!platformAddress) {
    console.error('❌ PLATFORM_SIGNER_ADDRESS not configured in .env');
    process.exit(1);
  }

  console.log('Checking platform wallet balance...');
  console.log(`Wallet Address: ${platformAddress}`);

  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(platformAddress);
    const ethBalance = Number(balance) / 1e18;

    console.log(`\nPlatform wallet balance: ${ethBalance.toFixed(6)} ETH`);

    if (ethBalance < 0.1) {
      console.warn('\n⚠️  LOW BALANCE ALERT: Please fund wallet!');
      console.warn('   Recommended: Add at least 0.5 ETH to cover gas costs');
      console.warn('   Sepolia Faucet: https://sepoliafaucet.com/');
      process.exit(1);
    } else if (ethBalance < 0.3) {
      console.warn('\n⚠️  Balance is getting low. Consider adding more ETH soon.');
    } else {
      console.log('\n✓ Wallet balance is sufficient');
    }

    // Get recent transaction count
    const txCount = await provider.getTransactionCount(platformAddress);
    console.log(`Total transactions: ${txCount}`);

  } catch (error) {
    console.error('❌ Error checking wallet balance:', error);
    process.exit(1);
  }
}

checkBalance();
