import { redis } from './redis';

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
  
  // Check if someone beat a user's high score and notify them
  static async checkScoreBeaten(newScore: number, playerFid: number, playerName: string) {
    try {
      if (!redis) return;

      // Get all players with lower scores than the new score
      const allPlayers = await redis.zrevrange('leaderboard:global', 0, -1, 'WITHSCORES');
      
      for (let i = 0; i < allPlayers.length; i += 2) {
        const fid = parseInt(allPlayers[i]);
        const currentScore = parseInt(allPlayers[i + 1]);
        
        // Skip the player who just scored
        if (fid === playerFid) continue;
        
        // If this player's score was beaten by the new score
        if (currentScore < newScore) {
          await this.sendScoreBeatenNotification(fid, playerName, newScore, currentScore);
        }
      }
    } catch (error) {
      console.error('Error checking score beaten:', error);
    }
  }

  // Check rank changes and notify users near top 10
  static async checkRankChanges() {
    try {
      if (!redis) return;

      // Get top 15 players (to catch those near top 10)
      const topPlayers = await redis.zrevrange('leaderboard:global', 0, 14, 'WITHSCORES');
      
      for (let i = 0; i < topPlayers.length; i += 2) {
        const fid = parseInt(topPlayers[i]);
        const score = parseInt(topPlayers[i + 1]);
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

  // Send notification when someone beats user's score
  private static async sendScoreBeatenNotification(fid: number, beaterName: string, newScore: number, oldScore: number) {
    const notification = {
      fid,
      notification: {
        title: "Your Score Was Beaten! 🏆",
        body: `${beaterName} just scored ${newScore.toLocaleString()} points! Time to reclaim your throne`,
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
    const notification = {
      fid,
      notification: {
        title: "So Close to Top 10! 🎯",
        body: `You're only ${spotsFromTop10} spots away from the top 10! Can you climb higher?`,
        notificationDetails: {
          type: 'near_top10',
          spotsFromTop10
        }
      }
    };

    await this.sendNotification(notification);
  }

  // Send notification for top 5% players
  private static async sendTop5PercentNotification(fid: number, rank: number) {
    const notification = {
      fid,
      notification: {
        title: "Elite Player! 🔥",
        body: `You're in the top 5% globally! One more game to secure your rank`,
        notificationDetails: {
          type: 'top_percent',
          rank
        }
      }
    };

    await this.sendNotification(notification);
  }

  // Send the actual notification
  private static async sendNotification(payload: any) {
    try {
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
      const lastSent = await redis.get(key);
      
      // Don't send same type of notification more than once per hour
      if (lastSent) {
        const timeSince = Date.now() - parseInt(lastSent);
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
