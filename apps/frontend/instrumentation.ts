import 'server-only';

export async function register() {
  // Only initialize PostgreSQL connection in Node.js runtime, not Edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs' || typeof EdgeRuntime === 'undefined') {
    // Dynamic import to avoid bundling pg client in Edge runtime
    const { initializeConnection } = await import('@/lib/pg');
    console.log('Initializing PostgreSQL connection on application startup...');
    initializeConnection();
  }
}