import { gameDataService } from '@/app/services/gameDataService';
import { redis } from '@/lib/redis';

// AI Agent for automated reward distribution
export class RewardDistributionAgent {
  private static instance: RewardDistributionAgent;
  private isProcessing = false;
  
  private constructor() {}
  
  static getInstance(): RewardDistributionAgent {
    if (!RewardDistributionAgent.instance) {
      RewardDistributionAgent.instance = new RewardDistributionAgent();
    }
    return RewardDistributionAgent.instance;
  }

  // Main AI decision engine for reward distribution
  async evaluateAndDistribute(trigger: 'weekly_reset' | 'daily_bonus' | 'manual'): Promise<{
    shouldDistribute: boolean;
    reason: string;
    timeframe?: 'week' | 'month' | 'all-time';
    estimatedAmount?: number;
  }> {
    if (this.isProcessing) {
      return { shouldDistribute: false, reason: 'Distribution already in progress' };
    }

    try {
      this.isProcessing = true;
      console.log(`🤖 AI Agent evaluating reward distribution for trigger: ${trigger}`);

      // Get current game state
      const globalStats = await gameDataService.getGlobalStats();
      const weeklyLeaderboard = await gameDataService.getLeaderboard('week', 10);
      
      // AI decision logic based on trigger type and game state
      switch (trigger) {
        case 'weekly_reset':
          return await this.evaluateWeeklyDistribution(weeklyLeaderboard, globalStats);
        
        case 'daily_bonus':
          return await this.evaluateDailyDistribution(globalStats);
        
        case 'manual':
          return { shouldDistribute: true, reason: 'Manual trigger approved', timeframe: 'week' };
        
        default:
          return { shouldDistribute: false, reason: 'Unknown trigger type' };
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Evaluate weekly reward distribution
  private async evaluateWeeklyDistribution(
    leaderboard: any[], 
    globalStats: any
  ): Promise<{ shouldDistribute: boolean; reason: string; timeframe?: 'week'; estimatedAmount?: number }> {
    
    // Check if there are eligible players
    const eligiblePlayers = leaderboard.filter(player => 
      player.playerId && 
      player.score > 0 && 
      player.playerId.startsWith('0x')
    );

    if (eligiblePlayers.length === 0) {
      return { 
        shouldDistribute: false, 
        reason: 'No eligible players with valid wallet addresses and scores' 
      };
    }

    // Check if reward pool is configured
    const rewardAmount = parseFloat(globalStats.rewardAmount || globalStats.totalRewards || '0');
    if (rewardAmount <= 0) {
      return { 
        shouldDistribute: false, 
        reason: 'No reward pool configured' 
      };
    }

    // Check if we already distributed rewards recently
    if (redis) {
      const recentDistribution = await this.getLastDistribution('week');
      if (recentDistribution && this.isRecentDistribution(recentDistribution.timestamp)) {
        return { 
          shouldDistribute: false, 
          reason: 'Rewards already distributed recently for this week' 
        };
      }
    }

    // AI logic: Distribute if top player has significant score
    const topPlayer = eligiblePlayers[0];
    const minimumTopScore = 1000; // Configurable threshold
    
    if (topPlayer.score < minimumTopScore) {
      return { 
        shouldDistribute: false, 
        reason: `Top player score (${topPlayer.score}) below minimum threshold (${minimumTopScore})` 
      };
    }

    // Calculate estimated distribution amount
    const estimatedAmount = this.calculateEstimatedDistribution(eligiblePlayers, rewardAmount);

    return {
      shouldDistribute: true,
      reason: `Weekly distribution approved: ${eligiblePlayers.length} eligible players, top score: ${topPlayer.score}`,
      timeframe: 'week',
      estimatedAmount
    };
  }

  // Evaluate daily bonus distribution (smaller amounts)
  private async evaluateDailyDistribution(globalStats: any): Promise<{
    shouldDistribute: boolean; 
    reason: string; 
    timeframe?: 'week';
    estimatedAmount?: number;
  }> {
    
    // Daily bonuses are smaller, more frequent distributions
    const rewardAmount = parseFloat(globalStats.rewardAmount || globalStats.totalRewards || '0');
    const dailyBudget = rewardAmount * 0.1; // 10% of weekly pool for daily bonuses
    
    if (dailyBudget < 0.001) { // Minimum 0.001 ETH for daily distribution
      return { 
        shouldDistribute: false, 
        reason: 'Daily bonus budget too small' 
      };
    }

    // Check if we already did daily distribution today
    if (redis) {
      const today = new Date().toDateString();
      const lastDaily = await redis.get(`daily_distribution:${today}`);
      if (lastDaily) {
        return { 
          shouldDistribute: false, 
          reason: 'Daily bonus already distributed today' 
        };
      }
    }

    return {
      shouldDistribute: true,
      reason: 'Daily bonus distribution approved',
      timeframe: 'week',
      estimatedAmount: dailyBudget
    };
  }

  // Execute the reward distribution
  async executeDistribution(
    timeframe: 'week' | 'month' | 'all-time',
    triggerType: 'automated' | 'manual' = 'automated'
  ): Promise<{ success: boolean; message: string; transactionHashes?: string[] }> {
    
    try {
      console.log(`🚀 AI Agent executing ${timeframe} reward distribution`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/rewards/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframe,
          triggerType,
          automatedSecret: process.env.AUTOMATED_TRIGGER_SECRET
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log(`✅ AI Agent successfully distributed rewards: ${result.message}`);
        
        // Store execution record
        if (redis) {
          await redis.set(
            `ai_distribution:${timeframe}:${Date.now()}`,
            JSON.stringify({
              timestamp: new Date().toISOString(),
              timeframe,
              success: true,
              message: result.message,
              totalAmount: result.totalAmount,
              recipientCount: result.distributed?.length || 0
            }),
            { ex: 60 * 60 * 24 * 7 } // 7 days
          );
        }

        return {
          success: true,
          message: result.message,
          transactionHashes: result.distributed?.map((d: any) => d.transactionHash).filter(Boolean)
        };
      } else {
        console.error(`❌ AI Agent distribution failed:`, result.error);
        return {
          success: false,
          message: result.error || 'Distribution failed'
        };
      }
    } catch (error) {
      console.error('❌ AI Agent execution error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown execution error'
      };
    }
  }

  // Hook into existing leaderboard reset functionality
  async onWeeklyLeaderboardReset(): Promise<void> {
    console.log('🔄 AI Agent detected weekly leaderboard reset');
    
    const evaluation = await this.evaluateAndDistribute('weekly_reset');
    
    if (evaluation.shouldDistribute && evaluation.timeframe) {
      console.log(`🎯 AI Agent decision: ${evaluation.reason}`);
      
      // Wait a bit for the reset to complete
      setTimeout(async () => {
        const result = await this.executeDistribution(evaluation.timeframe!);
        console.log(`🏁 AI Agent distribution result: ${result.message}`);
      }, 5000); // 5 second delay
    } else {
      console.log(`⏸️ AI Agent skipping distribution: ${evaluation.reason}`);
    }
  }

  // Utility methods
  private async getLastDistribution(timeframe: string): Promise<any> {
    if (!redis) return null;
    
    const keys = await redis.keys(`reward_distribution:${timeframe}:*`);
    if (keys.length === 0) return null;
    
    const latestKey = keys.sort().pop();
    if (!latestKey) return null;
    
    const record = await redis.get(latestKey);
    return record ? JSON.parse(record as string) : null;
  }

  private isRecentDistribution(timestamp: string): boolean {
    const distributionTime = new Date(timestamp);
    const now = new Date();
    const hoursSince = (now.getTime() - distributionTime.getTime()) / (1000 * 60 * 60);
    
    return hoursSince < 24; // Consider recent if within 24 hours
  }

  private calculateEstimatedDistribution(players: any[], rewardPool: number): number {
    // Estimate based on top 10 distribution percentages
    const distributionPercentages = [0.4, 0.2, 0.15, 0.1, 0.067, 0.04, 0.02, 0.01, 0.007, 0.003];
    
    let total = 0;
    for (let i = 0; i < Math.min(players.length, 10); i++) {
      total += rewardPool * distributionPercentages[i];
    }
    
    return total;
  }
}

// Export singleton instance
export const rewardAgent = RewardDistributionAgent.getInstance();
