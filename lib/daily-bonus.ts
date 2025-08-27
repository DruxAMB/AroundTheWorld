import { redis } from "./redis";

export interface DailyBonusData {
  claimedAt: string;
  bonusAmount: number;
  date: string;
}

export interface PlayerBonusStats {
  streak: number;
  totalBonusPoints: number;
  lastUpdated: string;
}

export class DailyBonusService {
  private readonly DAILY_BONUS_PREFIX = "daily_bonus:";
  private readonly DEFAULT_BONUS_AMOUNT = 100;

  /**
   * Get today's date in UTC format (YYYY-MM-DD)
   */
  private getTodayUTC(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Generate Redis key for daily bonus tracking
   */
  private getDailyBonusKey(walletAddress: string, date?: string): string {
    const targetDate = date || this.getTodayUTC();
    return `${this.DAILY_BONUS_PREFIX}${walletAddress}:${targetDate}`;
  }
  
  /**
   * Generate Redis key for player bonus stats
   */
  private getPlayerStatsKey(walletAddress: string): string {
    return `${this.DAILY_BONUS_PREFIX}${walletAddress}:stats`;
  }
  
  /**
   * Get player's bonus stats from Redis
   */
  async getPlayerBonusStats(walletAddress: string): Promise<PlayerBonusStats | null> {
    if (!redis) return null;
    
    try {
      const key = this.getPlayerStatsKey(walletAddress);
      const data = await redis.get(key);
      
      if (!data) return null;
      
      return typeof data === 'string' ? JSON.parse(data) as PlayerBonusStats : data as PlayerBonusStats;
    } catch (error) {
      console.error('Error fetching player bonus stats:', error);
      return null;
    }
  }
  
  /**
   * Save player's bonus stats to Redis
   */
  async savePlayerBonusStats(walletAddress: string, stats: PlayerBonusStats): Promise<boolean> {
    if (!redis) return false;
    
    try {
      const key = this.getPlayerStatsKey(walletAddress);
      await redis.set(key, JSON.stringify(stats));
      return true;
    } catch (error) {
      console.error('Error saving player bonus stats:', error);
      return false;
    }
  }

  /**
   * Check if player has already claimed today's bonus
   */
  async hasClaimedToday(walletAddress: string): Promise<boolean> {
    if (!redis) return false;

    try {
      const key = this.getDailyBonusKey(walletAddress);
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Error checking daily bonus claim status:', error);
      return false;
    }
  }

  /**
   * Get today's bonus claim data if it exists
   */
  async getTodaysBonusData(walletAddress: string): Promise<DailyBonusData | null> {
    if (!redis) return null;

    try {
      const key = this.getDailyBonusKey(walletAddress);
      const data = await redis.get(key);
      
      if (!data) return null;
      
      return typeof data === 'string' ? JSON.parse(data) as DailyBonusData : data as DailyBonusData;
    } catch (error) {
      console.error('Error fetching daily bonus data:', error);
      return null;
    }
  }

  /**
   * Claim today's daily bonus
   */
  async claimDailyBonus(walletAddress: string): Promise<{ success: boolean; bonusAmount: number; message: string; streak?: number; totalBonusPoints?: number }> {
    if (!redis) {
      return { success: false, bonusAmount: 0, message: "Redis not available" };
    }

    try {
      // Check if already claimed today
      const alreadyClaimed = await this.hasClaimedToday(walletAddress);
      if (alreadyClaimed) {
        return { success: false, bonusAmount: 0, message: "Daily bonus already claimed today" };
      }

      const today = this.getTodayUTC();
      const bonusData: DailyBonusData = {
        claimedAt: new Date().toISOString(),
        bonusAmount: this.DEFAULT_BONUS_AMOUNT,
        date: today
      };

      // Store the claim with 48-hour expiration (allows for timezone flexibility)
      const key = this.getDailyBonusKey(walletAddress);
      await redis.setex(key, 60 * 60 * 48, JSON.stringify(bonusData));

      // Get or initialize player stats
      let playerStats = await this.getPlayerBonusStats(walletAddress);
      
      // Check if yesterday was claimed to maintain streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = this.getDailyBonusKey(walletAddress, yesterday.toISOString().split('T')[0]);
      const yesterdayClaimed = await redis.exists(yesterdayKey);
      
      if (!playerStats) {
        // Initialize new player stats
        playerStats = {
          streak: 1, // Starting streak
          totalBonusPoints: this.DEFAULT_BONUS_AMOUNT,
          lastUpdated: new Date().toISOString()
        };
      } else {
        // Update existing stats
        playerStats.totalBonusPoints += this.DEFAULT_BONUS_AMOUNT;
        
        // If yesterday was claimed, increment streak, otherwise reset to 1
        playerStats.streak = yesterdayClaimed === 1 ? playerStats.streak + 1 : 1;
        playerStats.lastUpdated = new Date().toISOString();
      }
      
      // Save updated stats
      await this.savePlayerBonusStats(walletAddress, playerStats);

      return { 
        success: true, 
        bonusAmount: this.DEFAULT_BONUS_AMOUNT, 
        message: "Daily bonus claimed successfully!",
        streak: playerStats.streak,
        totalBonusPoints: playerStats.totalBonusPoints
      };
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      return { success: false, bonusAmount: 0, message: "Failed to claim daily bonus" };
    }
  }

  /**
   * Get player's claim history for the last N days (optimized with batch operations)
   */
  async getClaimHistory(walletAddress: string, days: number = 7): Promise<DailyBonusData[]> {
    if (!redis) return [];

    try {
      const history: DailyBonusData[] = [];
      const today = new Date();
      const keys: string[] = [];

      // Generate all keys first
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        keys.push(this.getDailyBonusKey(walletAddress, dateStr));
      }

      // Batch fetch all keys at once (1 Redis call instead of N)
      const pipeline = redis.pipeline();
      keys.forEach(key => pipeline.get(key));
      const results = await pipeline.exec();

      // Process results
      results?.forEach((result: unknown) => {
        // Redis pipeline results are arrays: [error, data] or null
        if (!result || !Array.isArray(result)) return;
        
        const resultArray = result as [Error | null, unknown];
        if (resultArray[1]) { // resultArray[0] is error, resultArray[1] is data
          try {
            const bonusData: DailyBonusData = typeof resultArray[1] === 'string' ? JSON.parse(resultArray[1] as string) : resultArray[1] as DailyBonusData;
            history.push(bonusData);
          } catch (parseError) {
            console.warn('Failed to parse bonus data:', parseError);
          }
        }
      });

      return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error fetching claim history:', error);
      return [];
    }
  }

  /**
   * Get total bonus points earned by player
   */
  async getTotalBonusPoints(walletAddress: string, days: number = 30): Promise<number> {
    try {
      const history = await this.getClaimHistory(walletAddress, days);
      return history.reduce((total, claim) => total + claim.bonusAmount, 0);
    } catch (error) {
      console.error('Error calculating total bonus points:', error);
      return 0;
    }
  }

  /**
   * Get player's current streak (consecutive daily claims)
   */
  async getCurrentStreak(walletAddress: string): Promise<number> {
    if (!redis) return 0;

    try {
      // First try to get the cached streak from player stats
      const playerStats = await this.getPlayerBonusStats(walletAddress);
      if (playerStats) {
        // Check if stats were updated today or yesterday (still valid)
        const lastUpdated = new Date(playerStats.lastUpdated);
        const today = new Date();
        const diffDays = Math.floor((today.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
        
        // If stats are recent (from today or yesterday), use cached streak
        if (diffDays <= 1) {
          console.log(`Using cached streak value (${playerStats.streak}) for ${walletAddress}`);
          return playerStats.streak;
        }
      }
      
      // Fallback to calculating from history if no valid cached streak
      // Get the last 7 days of claim history
      console.log(`Calculating streak from history for ${walletAddress}`);
      const history = await this.getClaimHistory(walletAddress, 7);
      
      // Calculate streak by checking consecutive days from today
      let streak = 0;
      const today = this.getTodayUTC();
      
      // Start from today and count consecutive days
      for (let i = 0; i < history.length; i++) {
        const dateToCheck = new Date();
        dateToCheck.setDate(dateToCheck.getDate() - i);
        const dateKey = dateToCheck.toISOString().split('T')[0];
        
        // If the day was claimed, increment streak
        const claimed = history.some(h => h.date === dateKey);
        
        if (claimed) {
          streak++;
        } else {
          // Break on first missed day
          break;
        }
      }
      
      // Save this calculated streak to avoid recalculation
      const totalBonusPoints = playerStats?.totalBonusPoints || 0;
      await this.savePlayerBonusStats(walletAddress, {
        streak,
        totalBonusPoints,
        lastUpdated: new Date().toISOString()
      });
      
      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  }
}

export const dailyBonusService = new DailyBonusService();
