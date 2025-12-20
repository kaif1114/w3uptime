import { prisma } from 'db/client';

/**
 * One-time migration script to sync User.claimedReputation with Transaction records
 *
 * This fixes the bug where:
 * - GET /api/reputation reads from Transaction table
 * - POST /api/reputation/claim-success writes to User.claimedReputation
 *
 * After this migration, both systems will use User.claimedReputation as single source of truth.
 */
async function syncClaimedReputation() {
  console.log('🚀 Starting claimed reputation sync...\n');

  const users = await prisma.user.findMany({
    select: { id: true, walletAddress: true, claimedReputation: true }
  });

  console.log(`Found ${users.length} users to process\n`);

  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      // Calculate actual claimed amount from transactions
      const claimedTransactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          type: 'REPUTATION_CLAIM',
          status: 'CONFIRMED'
        },
        select: { amount: true }
      });

      const actualClaimed = claimedTransactions.reduce(
        (sum, tx) => sum + Number(tx.amount),
        0
      );

      const currentClaimed = user.claimedReputation || 0;

      if (currentClaimed === actualClaimed) {
        console.log(`⏭️  ${user.walletAddress}: Already synced (${actualClaimed} points)`);
        skippedCount++;
        continue;
      }

      // Update User.claimedReputation to match Transaction records
      await prisma.user.update({
        where: { id: user.id },
        data: { claimedReputation: actualClaimed }
      });

      console.log(`✅ ${user.walletAddress}: Synced ${currentClaimed} → ${actualClaimed} points`);
      syncedCount++;

    } catch (error) {
      console.error(`❌ ${user.walletAddress}: Error syncing -`, error);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log('='.repeat(60));
  console.log(`Total users:     ${users.length}`);
  console.log(`✅ Synced:        ${syncedCount}`);
  console.log(`⏭️  Skipped:       ${skippedCount}`);
  console.log(`❌ Errors:        ${errorCount}`);
  console.log('='.repeat(60));
  console.log('\n✨ Migration complete!');
}

syncClaimedReputation()
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
