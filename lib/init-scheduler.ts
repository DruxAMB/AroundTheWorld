import { leaderboardScheduler } from './scheduler';

// Initialize the scheduler when the app starts
export function initializeScheduler() {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
    console.log('🚀 [Init] Starting leaderboard scheduler...');
    leaderboardScheduler.start();
  } else {
    console.log('⏸️ [Init] Scheduler disabled in development mode. Set ENABLE_SCHEDULER=true to enable.');
  }
}

// Auto-initialize if this file is imported
if (typeof window === 'undefined') {
  // Only run on server-side
  initializeScheduler();
}
