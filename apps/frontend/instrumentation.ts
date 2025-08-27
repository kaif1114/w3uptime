import 'server-only';

import { initializeConnection } from '@/lib/pg';

export async function register() {
  // Initialize PostgreSQL connection when the Next.js server starts
  console.log('Initializing PostgreSQL connection on application startup...');
  initializeConnection();
}