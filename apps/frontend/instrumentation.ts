import 'server-only';


export async function register() {
  // Only initialize PostgreSQL connection in Node.js runtime, not Edge runtime
  if (process.env.NEXT_RUNTIME !== 'edge') {
    // Dynamic import to avoid bundling pg client in Edge runtime
    const { initializeConnection } = await import('@/lib/pg');
    console.log('Initializing PostgreSQL connection on application startup...');
    initializeConnection();

    // Initialize workers in development mode
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('Initializing escalation workers...');
        const { WorkerManager } = await import('@/lib/initApp');
        const workerManager = WorkerManager.getInstance();
        await workerManager.initializeWorkers();
        console.log('✅ Escalation workers initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize escalation workers:', error);
      }
    }
  }
}