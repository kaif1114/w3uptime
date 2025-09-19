#!/usr/bin/env node

// Script to clean up the test user and related data
const { prisma } = require('./packages/db/src/index.cjs');

async function cleanupTestUser() {
  console.log('🧹 Cleaning up test user and related data...\n');

  try {
    // Find the test user
    const testUser = await prisma.user.findUnique({
      where: { walletAddress: testWalletAddress },
      include: {
        monitors: {
          include: {
            escalationPolicy: {
              include: {
                levels: true
              }
            }
          }
        },
        sessions: true
      }
    });

    if (!testUser) {
      console.log('✅ No test user found to clean up');
      return;
    }

    console.log('🔍 Found test user:', testUser.id);
    console.log('📊 Data to clean up:');
    console.log(`   - User: ${testUser.walletAddress}`);
    console.log(`   - Sessions: ${testUser.sessions.length}`);
    console.log(`   - Monitors: ${testUser.monitors.length}`);

    // Clean up in the correct order due to foreign key constraints
    
    // 1. Delete escalation logs first
    for (const monitor of testUser.monitors) {
      if (monitor.escalationPolicy) {
        console.log(`🗑️ Cleaning escalation logs for monitor: ${monitor.name}`);
        
        // Delete escalation logs
        await prisma.escalationLog.deleteMany({
          where: {
            escalationLevel: {
              escalationId: monitor.escalationPolicy.id
            }
          }
        });

        // Delete alerts for this monitor
        await prisma.alert.deleteMany({
          where: { monitorId: monitor.id }
        });

        // Delete timeline events
        await prisma.timelineEvent.deleteMany({
          where: {
            incident: {
              monitorId: monitor.id
            }
          }
        });

        // Delete incidents
        await prisma.incident.deleteMany({
          where: { monitorId: monitor.id }
        });
      }
    }

    // 2. Delete escalation levels and policies
    for (const monitor of testUser.monitors) {
      if (monitor.escalationPolicy) {
        console.log(`🗑️ Deleting escalation policy: ${monitor.escalationPolicy.name}`);
        
        // Delete escalation levels first
        await prisma.escalationLevel.deleteMany({
          where: { escalationId: monitor.escalationPolicy.id }
        });

        // Delete escalation policy
        await prisma.escalationPolicy.delete({
          where: { id: monitor.escalationPolicy.id }
        });
      }
    }

    // 3. Delete monitors
    for (const monitor of testUser.monitors) {
      console.log(`🗑️ Deleting monitor: ${monitor.name}`);
      await prisma.monitor.delete({
        where: { id: monitor.id }
      });
    }

    // 4. Delete sessions
    console.log(`🗑️ Deleting ${testUser.sessions.length} sessions`);
    await prisma.session.deleteMany({
      where: { walletAddress: testWalletAddress }
    });

    // 5. Finally delete the user
    console.log(`🗑️ Deleting test user: ${testUser.walletAddress}`);
    await prisma.user.delete({
      where: { id: testUser.id }
    });

    console.log('\n✅ Test user and all related data cleaned up successfully!');
    console.log('🎯 You can now use your existing user ID for testing');

  } catch (error) {
    console.error('❌ Error cleaning up test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestUser();



