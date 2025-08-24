import { redis } from "./redis";

export interface DailyBonusData {
  claimedAt: string;
  bonusAmount: number;
  date: string;
}

export class DailyBonusService {
  private readonly DAILY_BONUS_PREFIX = "daily_bonus:";
  private readonly DEFAULT_BONUS_AMOUNT = 200;

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
      
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      console.error('Error fetching daily bonus data:', error);
      return null;
    }
  }

  /**
   * Claim today's daily bonus
   */
  async claimDailyBonus(walletAddress: string): Promise<{ success: boolean; bonusAmount: number; message: string }> {
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

      return { 
        success: true, 
        bonusAmount: this.DEFAULT_BONUS_AMOUNT, 
        message: "Daily bonus claimed successfully!" 
      };
    } catch (error) {
      console.error('Error claiming daily bonus:', error);
      return { success: false, bonusAmount: 0, message: "Failed to claim daily bonus" };
    }
  }

  /**
   * Get player's claim history for the last N days
   */
  async getClaimHistory(walletAddress: string, days: number = 7): Promise<DailyBonusData[]> {
    if (!redis) return [];

    try {
      const history: DailyBonusData[] = [];
      const today = new Date();

      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const key = this.getDailyBonusKey(walletAddress, dateStr);
        const data = await redis.get(key);
        
        if (data) {
          const bonusData = typeof data === 'string' ? JSON.parse(data) : data;
          history.push(bonusData);
        }
      }

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
   * Get streak count (consecutive days claimed)
   */
  async getCurrentStreak(walletAddress: string): Promise<number> {
    try {
      const history = await this.getClaimHistory(walletAddress, 30);
      if (history.length === 0) return 0;

      let streak = 0;
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const claimed = history.some(claim => claim.date === dateStr);
        if (claimed) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  }
}

export const dailyBonusService = new DailyBonusService();
