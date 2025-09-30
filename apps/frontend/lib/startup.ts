import { startBlockchainListener } from './blockchain-listener';

let initialized = false;

export function initializeApp() {
  if (initialized) {
    console.log('App already initialized');
    return;
  }

  console.log('Initializing W3Uptime app...');

  // Start blockchain listener in server environment
  if (typeof window === 'undefined') {
    // Only run on server side
    try {
      startBlockchainListener();
      console.log('Blockchain listener initialized');
    } catch (error) {
      console.error('Failed to initialize blockchain listener:', error);
    }
  }

  initialized = true;
  console.log('W3Uptime app initialization complete');
}

// Auto-initialize when module is imported on server side
if (typeof window === 'undefined') {
  initializeApp();
}