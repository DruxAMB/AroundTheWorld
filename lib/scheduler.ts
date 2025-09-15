import * as cron from 'node-cron';
import { gameDataService } from '@/app/services/gameDataService';

class LeaderboardScheduler {
  private static instance: LeaderboardScheduler;
  private weeklyResetJob: cron.ScheduledTask | null = null;

  private constructor() {}

  static getInstance(): LeaderboardScheduler {
    if (!LeaderboardScheduler.instance) {
      LeaderboardScheduler.instance = new LeaderboardScheduler();
    }
    return LeaderboardScheduler.instance;
  }

  // Start the weekly reset scheduler
  start() {
    if (this.weeklyResetJob) {
      console.log('📅 Weekly reset scheduler already running');
      return;
    }

    // Schedule for every Monday at 4:59pm UTC (16:59)
    // Run 1 minute before the leaderboard timer hits zero to ensure proper data collection
    // Cron format: second minute hour day-of-month month day-of-week
    // 0 59 16 * * 1 = Every Monday at 16:59 (4:59pm UTC)
    this.weeklyResetJob = cron.schedule('0 59 16 * * 1', async () => {
      console.log('🔄 [Scheduler] Starting weekly leaderboard reset...');
      
      try {
        // Call the existing reset-leaderboard API endpoint for weekly reset
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/admin/reset-leaderboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeframe: 'week' })
        });
        
        const result = await response.json();
        
        console.log(`✅ [Scheduler] Weekly leaderboard reset completed: ${result.message}`);
        console.log(`📊 [Scheduler] Result:`, result.result);
        
      } catch (error) {
        console.error('❌ [Scheduler] Weekly reset failed:', error);
      }
    }, {
      timezone: 'UTC'
    });
    console.log('📅 [Scheduler] Weekly reset scheduled for Mondays at 5pm UTC');
  }

  // Stop the scheduler
  stop() {
    if (this.weeklyResetJob) {
      this.weeklyResetJob.stop();
      this.weeklyResetJob = null;
      console.log('⏹️ [Scheduler] Weekly reset scheduler stopped');
    }
  }

  // Get next scheduled reset time
  getNextResetTime(): Date {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sunday, 1=Monday, etc.
    const currentHour = now.getUTCHours();
    
    // Calculate days until next Monday
    let daysUntilMonday = (1 - dayOfWeek + 7) % 7;
    if (dayOfWeek === 1 && currentHour < 17) {
      // If it's Monday before 5pm, reset is today
      daysUntilMonday = 0;
    } else if (dayOfWeek === 1 && currentHour >= 17) {
      // If it's Monday after 5pm, reset is next Monday
      daysUntilMonday = 7;
    }
    
    const nextReset = new Date(now);
    nextReset.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextReset.setUTCHours(17, 0, 0, 0); // 5pm UTC
    
    return nextReset;
  }

  // Check if scheduler is running
  isRunning(): boolean {
    return this.weeklyResetJob !== null;
  }
}

export const leaderboardScheduler = LeaderboardScheduler.getInstance();
