import { redis } from './redis';
import { gameDataService, LeaderboardEntry } from '@/app/services/gameDataService';

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
  static async checkScoreBeaten(newScore: number, winnerFid: number, winnerName: string, previousScore?: number) {
    try {
      // Input validation
      if (!newScore || newScore <= 0 || !winnerFid || !winnerName?.trim()) {
        console.warn('Invalid parameters for checkScoreBeaten', { newScore, winnerFid, winnerName, previousScore });
        return;
      }

      const scoreImprovement = previousScore && previousScore > 0 ? newScore - previousScore : newScore;
      console.log(`🔔 [CompetitiveNotifications] Checking if score ${newScore} beats others (improved by ${scoreImprovement})`);
      
      // Get current leaderboard to find players with lower scores
      const leaderboard = await gameDataService.getLeaderboard('all-time', 100); // Increased limit for better coverage
      
      if (leaderboard.length === 0) {
        console.log('No players found in leaderboard for score comparison');
        return;
      }
      
      // Find players whose scores were beaten (with safety checks)
      const beatenPlayers = leaderboard.filter((player) => 
        player && 
        typeof player.score === 'number' && 
        player.score < newScore && 
        player.fid !== winnerFid &&
        player.fid // Ensure FID exists
      );

      console.log(`Found ${beatenPlayers.length} players to notify about being beaten`);

      // Send notifications to beaten players with concurrency control
      const notificationPromises = beatenPlayers.map(async (player) => {
        if (player.fid) {
          try {
            await this.sendScoreBeatenNotification(player.fid, winnerName, newScore, player.score, scoreImprovement);
          } catch (error) {
            console.error(`Failed to send notification to FID ${player.fid}:`, error);
          }
        }
      });
      
      // Wait for all notifications with timeout
      await Promise.allSettled(notificationPromises);

      // Check for rank-based rewards notifications
      await this.checkRankRewardNotifications(winnerFid, winnerName, leaderboard);
    } catch (error) {
      console.error('Error checking score beaten:', error, { newScore, winnerFid, winnerName, previousScore });
    }
  }

  // Check rank changes and notify users near top 10
  static async checkRankChanges() {
    try {
      if (!redis) {
        console.warn('Redis not available for rank change notifications');
        return;
      }

      // Use gameDataService for consistent leaderboard access
      const leaderboard = await gameDataService.getLeaderboard('all-time', 15);
      
      if (leaderboard.length === 0) {
        console.log('No players found in leaderboard for rank change notifications');
        return;
      }
      
      for (const player of leaderboard) {
        if (!player.fid || !player.rank || typeof player.rank !== 'number') continue;
        
        const currentRank = player.rank;
        
        // Notify players who are close to top 10
        if (currentRank > 10 && currentRank <= 15) {
          const spotsFromTop10 = currentRank - 10;
          await this.sendNearTop10Notification(player.fid, spotsFromTop10);
        }
        
        // Notify top 5% players
        if (currentRank <= 5) {
          await this.sendTop5PercentNotification(player.fid, currentRank);
        }
      }
    } catch (error) {
      console.error('Error checking rank changes:', error);
    }
  }

  // Check rank-based reward notifications for new high scorer
  private static async checkRankRewardNotifications(winnerFid: number, winnerName: string, leaderboard: LeaderboardEntry[]) {
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
  private static async sendScoreBeatenNotification(fid: number, beaterName: string, newScore: number, oldScore: number, scoreImprovement?: number) {
    try {
      // Validate inputs
      if (!fid || !beaterName || newScore <= 0 || oldScore < 0) {
        console.warn('Invalid parameters for score beaten notification', { fid, beaterName, newScore, oldScore });
        return;
      }

      // Calculate potential rewards based on ranking with dynamic symbol
      const rewardText = await this.getRewardText(oldScore);
      
      const improvementText = scoreImprovement && scoreImprovement > 0 
        ? ` (improved by ${scoreImprovement.toLocaleString()})` 
        : '';
      
      const notification = {
        fid,
        notification: {
          title: "⚡ Someone Beat Your Score!",
          body: `${beaterName} scored ${newScore.toLocaleString()} points${improvementText}! ${rewardText} - Time to reclaim your throne!`,
          notificationDetails: {
            type: 'score_beaten',
            beaterName,
            newScore,
            oldScore,
            scoreImprovement: scoreImprovement || 0
          }
        }
      };

      await this.sendNotification(notification);
    } catch (error) {
      console.error('Error sending score beaten notification:', error, { fid, beaterName, newScore, oldScore });
    }
  }

  // Send notification for players near top 10
  private static async sendNearTop10Notification(fid: number, spotsFromTop10: number) {
    try {
      if (!fid || spotsFromTop10 <= 0 || spotsFromTop10 > 10) {
        console.warn('Invalid parameters for near top 10 notification', { fid, spotsFromTop10 });
        return;
      }

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
    } catch (error) {
      console.error('Error sending near top 10 notification:', error, { fid, spotsFromTop10 });
    }
  }

  // Send notification for top rank achievement
  private static async sendTopRankRewardNotification(fid: number, rank: number) {
    try {
      if (!fid || rank <= 0 || rank > 3) {
        console.warn('Invalid parameters for top rank notification', { fid, rank });
        return;
      }

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
    } catch (error) {
      console.error('Error sending top rank notification:', error, { fid, rank });
    }
  }

  // Send notification for top 10 achievement
  private static async sendTop10RewardNotification(fid: number, rank: number) {
    try {
      if (!fid || rank <= 0 || rank > 10) {
        console.warn('Invalid parameters for top 10 notification', { fid, rank });
        return;
      }

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
    } catch (error) {
      console.error('Error sending top 10 notification:', error, { fid, rank });
    }
  }

  // Send notification for top 5% players
  private static async sendTop5PercentNotification(fid: number, rank: number) {
    try {
      if (!fid || rank <= 0 || rank > 5) {
        console.warn('Invalid parameters for top 5% notification', { fid, rank });
        return;
      }

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
    } catch (error) {
      console.error('Error sending top 5% notification:', error, { fid, rank });
    }
  }

  // Calculate reward based on rank with dynamic symbol
  private static async calculateReward(rank: number): Promise<{amount: string, symbol: string}> {
    try {
      // Get current reward configuration directly from gameDataService
      const config = await gameDataService.getRewardConfig();
      
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
      // Fallback to ETH with safe defaults
      const baseAmount = 1.0;
      let rewardAmount: number;
      
      if (rank === 1) rewardAmount = baseAmount * 0.1;
      else if (rank === 2) rewardAmount = baseAmount * 0.05;
      else if (rank === 3) rewardAmount = baseAmount * 0.025;
      else if (rank <= 5) rewardAmount = baseAmount * 0.01;
      else if (rank <= 10) rewardAmount = baseAmount * 0.005;
      else rewardAmount = baseAmount * 0.001;
      
      return {
        amount: rewardAmount.toFixed(3),
        symbol: 'ETH'
      };
    }
  }

  // Get reward text for beaten score notifications with dynamic symbol
  private static async getRewardText(oldScore: number): Promise<string> {
    try {
      const config = await gameDataService.getRewardConfig();
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

      // Import and use the notification client directly for better reliability
      const { sendFrameNotification } = await import('./notification-client');
      const { getUserNotificationDetails } = await import('./notification');
      
      // Get notification tokens for this user
      const notificationDetails = await getUserNotificationDetails(payload.fid);
      
      if (!notificationDetails) {
        console.log(`No notification tokens found for FID ${payload.fid}, skipping competitive notification`);
        return;
      }

      // Send notification directly using the notification client
      const result = await sendFrameNotification({
        fid: payload.fid,
        title: payload.notification.title,
        body: payload.notification.body,
        notificationDetails
      });

      if (result.state === "success") {
        console.log(`✅ Competitive notification sent successfully to FID ${payload.fid}`);
      } else {
        console.warn(`⚠️ Competitive notification failed for FID ${payload.fid}:`, result);
      }
    } catch (error) {
      console.error('Error sending competitive notification:', error);
    }
  }

  // Rate limiting to prevent spam
  private static async shouldSendNotification(fid: number, type: string): Promise<boolean> {
    try {
      if (!redis) {
        console.warn('Redis not available for rate limiting, allowing notification');
        return true; // Allow notifications if Redis is down
      }

      // Validate inputs
      if (!fid || !type || fid <= 0) {
        console.warn('Invalid parameters for rate limiting check', { fid, type });
        return false;
      }

      const key = `notification_sent:${fid}:${type}`;
      const lastSent = await redis.get(key) as string | null;
      
      // Don't send same type of notification more than once per hour
      if (lastSent) {
        const lastSentTime = parseInt(lastSent);
        if (isNaN(lastSentTime)) {
          console.warn('Invalid timestamp in rate limit key, allowing notification');
          await redis.del(key); // Clean up invalid data
        } else {
          const timeSince = Date.now() - lastSentTime;
          if (timeSince < 60 * 60 * 1000) { // 1 hour
            console.log(`Rate limited: ${type} notification for FID ${fid}, ${Math.round((60 * 60 * 1000 - timeSince) / 1000 / 60)} minutes remaining`);
            return false;
          }
        }
      }

      // Mark as sent with error handling
      try {
        await redis.setex(key, 60 * 60, Date.now().toString()); // 1 hour expiry
      } catch (setError) {
        console.error('Failed to set rate limit key, but allowing notification:', setError);
      }
      
      return true;
    } catch (error) {
      console.error('Error checking notification rate limit:', error);
      return true; // Allow notifications on error to avoid blocking legitimate notifications
    }
  }
}
