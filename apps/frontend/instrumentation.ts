import 'server-only';


export async function register() {
  // Only initialize PostgreSQL connection in Node.js runtime, not Edge runtime
  if (process.env.NEXT_RUNTIME !== 'edge') {
    // Dynamic import to avoid bundling pg client in Edge runtime
    const { initializeConnection } = await import('@/lib/pg');
    console.log('Initializing PostgreSQL connection on application startup...');
    initializeConnection();

    // Initialize BullMQ Alert System
    try {
      const { initializeAlertSystem } = await import('@/lib/alertsysteminit');
      console.log('Initializing BullMQ Alert System on application startup...');
      await initializeAlertSystem();
    } catch (error) {
      console.error('❌ Failed to initialize Alert System:', error);
      // Don't fail the entire app if alert system fails to initialize
    }
  }
}