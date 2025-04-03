import { redis } from '../../lib/redis';
import { LeaderboardEntry } from '../utils/gameTypes';

// Redis key prefixes
const LEADERBOARD_KEY = 'leaderboard';
const USER_DATA_KEY_PREFIX = 'user:';
const USER_SCORES_KEY = 'user_scores';

export interface UserData {
  address: string;
  highestLevel: number;
  highestScore: number;
  totalGamesPlayed: number;
  lastPlayed: number;
  achievements?: string[];
}

class RedisService {
  private static instance: RedisService;

  private constructor() {}

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Add or update a score in the leaderboard
   */
  public async addScore(entry: LeaderboardEntry): Promise<boolean> {
    if (!redis) return false;

    try {
      // Add to sorted set with score as the sorting value
      await redis.zadd(LEADERBOARD_KEY, { 
        score: entry.score, 
        member: JSON.stringify({
          address: entry.address,
          level: entry.level,
          timestamp: entry.timestamp
        })
      });

      // Also store in user-specific history
      const userScoreKey = `${USER_SCORES_KEY}:${entry.address.toLowerCase()}`;
      await redis.zadd(userScoreKey, {
        score: entry.timestamp, // Sort by timestamp
        member: JSON.stringify({
          score: entry.score,
          level: entry.level,
          timestamp: entry.timestamp
        })
      });

      return true;
    } catch (error) {
      console.error('Error adding score to leaderboard:', error);
      return false;
    }
  }

  /**
   * Get top scores from the leaderboard
   */
  public async getTopScores(limit: number = 10): Promise<LeaderboardEntry[]> {
    if (!redis) return [];

    try {
      // Get top scores in descending order
      const results = await redis.zrange(LEADERBOARD_KEY, 0, limit - 1, {
        rev: true // Reverse order (highest scores first)
      });

      return results.map((item: unknown) => {
        if (typeof item !== 'string') {
          console.error('Expected string but got:', typeof item);
          return {
            address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
            score: 0,
            level: 0,
            timestamp: Date.now()
          };
        }
        
        const parsed = JSON.parse(item);
        return {
          address: parsed.address as `0x${string}`,
          score: parsed.score || 0,
          level: parsed.level || 0,
          timestamp: parsed.timestamp || Date.now()
        };
      });
    } catch (error) {
      console.error('Error getting top scores:', error);
      return [];
    }
  }

  /**
   * Get a user's rank in the leaderboard
   */
  public async getUserRank(address: string): Promise<number> {
    if (!redis) return -1;

    try {
      // Find all scores to search through them
      const allScores = await redis.zrange(LEADERBOARD_KEY, 0, -1, {
        rev: true // Reverse order (highest scores first)
      });

      // Find the user's position
      const index = allScores.findIndex(item => {
        const parsed = JSON.parse(item as string);
        return parsed.address.toLowerCase() === address.toLowerCase();
      });

      return index !== -1 ? index + 1 : -1;
    } catch (error) {
      console.error('Error getting user rank:', error);
      return -1;
    }
  }

  /**
   * Store or update user data
   */
  public async saveUserData(userData: UserData): Promise<boolean> {
    if (!redis) return false;

    try {
      const key = `${USER_DATA_KEY_PREFIX}${userData.address.toLowerCase()}`;
      await redis.set(key, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Error saving user data:', error);
      return false;
    }
  }

  /**
   * Get user data
   */
  public async getUserData(address: string): Promise<UserData | null> {
    if (!redis) return null;

    try {
      const key = `${USER_DATA_KEY_PREFIX}${address.toLowerCase()}`;
      const data = await redis.get<string>(key);
      
      if (!data) return null;
      
      return JSON.parse(data as string) as UserData;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  /**
   * Get user's score history
   */
  public async getUserScoreHistory(address: string, limit: number = 10): Promise<any[]> {
    if (!redis) return [];

    try {
      const userScoreKey = `${USER_SCORES_KEY}:${address.toLowerCase()}`;
      const scores = await redis.zrange(userScoreKey, 0, limit - 1, {
        rev: true // Reverse order (most recent first)
      });

      return scores.map(item => JSON.parse(item as string));
    } catch (error) {
      console.error('Error getting user score history:', error);
      return [];
    }
  }

  /**
   * Clear all leaderboard data (for testing/admin purposes)
   */
  public async clearLeaderboard(): Promise<boolean> {
    if (!redis) return false;

    try {
      await redis.del(LEADERBOARD_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing leaderboard:', error);
      return false;
    }
  }
}

export default RedisService;
