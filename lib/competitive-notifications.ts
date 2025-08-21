import { redis } from './redis';
import { gameDataService } from '@/app/services/gameDataService';

export interface CompetitiveNotification {
  type: 'score_beaten' | 'rank_change' | 'near_top10';
  fid: number;
  message: string;
  data?: {
    oldScore?: number;
    newScore?: number;
    oldRank?: number;
    newRank?: number;
    spotsFromTop10?: number;
  };
}

export class CompetitiveNotificationService {
  
  // Check if a new score beats existing players and notify them
  static async checkScoreBeaten(newScore: number, winnerFid: number, winnerName: string) {
    try {
      console.log(`🔔 [CompetitiveNotifications] Checking if score ${newScore} beats others`);
      
      // Get current leaderboard to find players with lower scores
      const leaderboard = await gameDataService.getLeaderboard('all-time', 50);
      
      // Find players whose scores were beaten
      const beatenPlayers = leaderboard.filter((player: any) => 
        player.score < newScore && player.fid !== winnerFid
      );

      console.log(`Found ${beatenPlayers.length} players to notify about being beaten`);

      // Send notifications to beaten players
      for (const player of beatenPlayers) {
        if (player.fid) {
          await this.sendScoreBeatenNotification(player.fid, winnerName, newScore, player.score);
        }
      }

      // Check for rank-based rewards notifications
      await this.checkRankRewardNotifications(winnerFid, winnerName, leaderboard);
    } catch (error) {
      console.error('Error checking score beaten:', error);
    }
  }

  // Check rank changes and notify users near top 10
  static async checkRankChanges() {
    try {
      if (!redis) return;

      // Get top 15 players (to catch those near top 10)
      const topPlayers = await redis.zrange('leaderboard:global', 0, 14, { rev: true, withScores: true }) as string[];
      
      for (let i = 0; i < topPlayers.length; i += 2) {
        const fid = parseInt(topPlayers[i] as string);
        const currentRank = Math.floor(i / 2) + 1;
        
        // Notify players who are close to top 10
        if (currentRank > 10 && currentRank <= 15) {
          const spotsFromTop10 = currentRank - 10;
          await this.sendNearTop10Notification(fid, spotsFromTop10);
        }
        
        // Notify top 5% players
        if (currentRank <= 5) {
          await this.sendTop5PercentNotification(fid, currentRank);
        }
      }
    } catch (error) {
      console.error('Error checking rank changes:', error);
    }
  }

  // Check rank-based reward notifications for new high scorer
  private static async checkRankRewardNotifications(winnerFid: number, winnerName: string, leaderboard: any[]) {
    try {
      // Find winner's new rank
      const winnerIndex = leaderboard.findIndex(player => player.fid === winnerFid);
      if (winnerIndex === -1) return;
      
      const newRank = winnerIndex + 1;
      
      // Send reward notifications based on rank
      if (newRank <= 3) {
        await this.sendTopRankRewardNotification(winnerFid, newRank);
      } else if (newRank <= 10) {
        await this.sendTop10RewardNotification(winnerFid, newRank);
      }
    } catch (error) {
      console.error('Error checking rank reward notifications:', error);
    }
  }

  // Send notification when someone beats user's score
  private static async sendScoreBeatenNotification(fid: number, beaterName: string, newScore: number, oldScore: number) {
    // Calculate potential rewards based on ranking with dynamic symbol
    const rewardText = await this.getRewardText(oldScore);
    
    const notification = {
      fid,
      notification: {
        title: "⚡ Someone Beat Your Score!",
        body: `${beaterName} scored ${newScore.toLocaleString()} points! ${rewardText} - Time to reclaim your throne!`,
        notificationDetails: {
          type: 'score_beaten',
          beaterName,
          newScore,
          oldScore
        }
      }
    };

    await this.sendNotification(notification);
  }

  // Send notification for players near top 10
  private static async sendNearTop10Notification(fid: number, spotsFromTop10: number) {
    const reward = await this.calculateReward(11 + spotsFromTop10 - 1);
    const notification = {
      fid,
      notification: {
        title: `🎯 So Close to ${reward.symbol} Rewards!`,
        body: `You're only ${spotsFromTop10} spots away from earning ${reward.amount} ${reward.symbol}! Push now to claim rewards!`,
        notificationDetails: {
          type: 'near_top10',
          spotsFromTop10,
          potentialReward: reward.amount,
          rewardSymbol: reward.symbol
        }
      }
    };

    await this.sendNotification(notification);
  }

  // Send notification for top rank achievement
  private static async sendTopRankRewardNotification(fid: number, rank: number) {
    const reward = await this.calculateReward(rank);
    const notification = {
      fid,
      notification: {
        title: "🏆 Champion Status Achieved!",
        body: `Congratulations! You're #${rank} and earning ${reward.amount} ${reward.symbol} rewards! Mint your NFT now!`,
        notificationDetails: {
          type: 'top_rank_reward',
          rank,
          rewardAmount: reward.amount,
          rewardSymbol: reward.symbol
        }
      }
    };

    await this.sendNotification(notification);
  }

  // Send notification for top 10 achievement
  private static async sendTop10RewardNotification(fid: number, rank: number) {
    const reward = await this.calculateReward(rank);
    const notification = {
      fid,
      notification: {
        title: "💎 Top 10 Elite Status!",
        body: `Amazing! You're #${rank} earning ${reward.amount} ${reward.symbol} rewards! Secure your position!`,
        notificationDetails: {
          type: 'top10_reward',
          rank,
          rewardAmount: reward.amount,
          rewardSymbol: reward.symbol
        }
      }
    };

    await this.sendNotification(notification);
  }

  // Send notification for top 5% players
  private static async sendTop5PercentNotification(fid: number, rank: number) {
    const reward = await this.calculateReward(rank);
    const notification = {
      fid,
      notification: {
        title: "🔥 Elite Rewards Zone!",
        body: `You're #${rank} earning ${reward.amount} ${reward.symbol} rewards! Defend your elite position!`,
        notificationDetails: {
          type: 'top_percent',
          rank,
          rewardAmount: reward.amount,
          rewardSymbol: reward.symbol
        }
      }
    };

    await this.sendNotification(notification);
  }

  // Calculate reward based on rank with dynamic symbol
  private static async calculateReward(rank: number): Promise<{amount: string, symbol: string}> {
    try {
      // Get current reward configuration from database
      const response = await fetch('/api/reward-config');
      const config = response.ok ? await response.json() : { symbol: 'ETH', amount: '1.000' };
      
      const baseAmount = parseFloat(config.amount);
      let rewardAmount: number;
      
      if (rank === 1) rewardAmount = baseAmount * 0.1;
      else if (rank === 2) rewardAmount = baseAmount * 0.05;
      else if (rank === 3) rewardAmount = baseAmount * 0.025;
      else if (rank <= 5) rewardAmount = baseAmount * 0.01;
      else if (rank <= 10) rewardAmount = baseAmount * 0.005;
      else rewardAmount = baseAmount * 0.001;
      
      return {
        amount: rewardAmount.toFixed(3),
        symbol: config.symbol
      };
    } catch (error) {
      console.error('Error fetching reward config:', error);
      // Fallback to ETH
      const ethAmounts = ["0.1", "0.05", "0.025", "0.01", "0.005", "0.001"];
      const amount = rank === 1 ? ethAmounts[0] : 
                   rank === 2 ? ethAmounts[1] : 
                   rank === 3 ? ethAmounts[2] : 
                   rank <= 5 ? ethAmounts[3] : 
                   rank <= 10 ? ethAmounts[4] : ethAmounts[5];
      return { amount, symbol: 'ETH' };
    }
  }

  // Get reward text for beaten score notifications with dynamic symbol
  private static async getRewardText(oldScore: number): Promise<string> {
    try {
      const response = await fetch('/api/reward-config');
      const config = response.ok ? await response.json() : { symbol: 'ETH', amount: '1.000' };
      const symbol = config.symbol;
      
      // Estimate rank based on score (simplified)
      if (oldScore > 50000) return `You could earn 0.01+ ${symbol} in top ranks`;
      if (oldScore > 30000) return `Top 10 rewards up to 0.1 ${symbol} available`;
      if (oldScore > 20000) return `${symbol} rewards await in the leaderboard`;
      return `Climb higher for ${symbol} rewards`;
    } catch (error) {
      console.error('Error fetching reward config for text:', error);
      return "Climb higher for rewards";
    }
  }

  // Send the actual notification
  private static async sendNotification(payload: { fid: number; notification: { title: string; body: string; notificationDetails: Record<string, unknown> } }) {
    try {
      // Check rate limiting first
      const notificationType = payload.notification.notificationDetails.type as string;
      const shouldSend = await this.shouldSendNotification(payload.fid, notificationType);
      
      if (!shouldSend) {
        console.log(`Rate limited: Not sending ${notificationType} notification to FID ${payload.fid}`);
        return;
      }

      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      console.log('Competitive notification sent successfully');
    } catch (error) {
      console.error('Error sending competitive notification:', error);
    }
  }

  // Rate limiting to prevent spam
  private static async shouldSendNotification(fid: number, type: string): Promise<boolean> {
    try {
      if (!redis) return false;

      const key = `notification_sent:${fid}:${type}`;
      const lastSent = await redis.get(key) as string | null;
      
      // Don't send same type of notification more than once per hour
      if (lastSent) {
        const timeSince = Date.now() - parseInt(lastSent as string);
        if (timeSince < 60 * 60 * 1000) { // 1 hour
          return false;
        }
      }

      // Mark as sent
      await redis.setex(key, 60 * 60, Date.now().toString()); // 1 hour expiry
      return true;
    } catch (error) {
      console.error('Error checking notification rate limit:', error);
      return false;
    }
  }
}
