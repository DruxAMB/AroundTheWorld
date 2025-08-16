import { redis } from "../../lib/redis";

export interface PlayerProfile {
  id: string;
  name: string;
  walletAddress: string;
  avatar: string;
  totalScore: number;
  levelsCompleted: number;
  bestLevel: number;
  createdAt: string;
  lastActive: string;
  [key: string]: string | number; // Index signature for Redis compatibility
}

export interface LevelProgress {
  levelId: string;
  score: number;
  stars: number;
  completed: boolean;
  bestScore: number;
  completedAt?: string;
}

export interface PlayerSettings {
  soundEnabled: boolean;
  musicVolume: number;
  soundVolume: number;
  animationsEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface PlayerGameData {
  profile: PlayerProfile;
  progress: LevelProgress[];
  settings: {
    soundEnabled: boolean;
    musicVolume: number;
    soundVolume: number;
    animationsEnabled: boolean;
    vibrationEnabled: boolean;
  };
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  avatar: string;
  score: number;
  levelsCompleted: number;
  bestLevel: number;
  rank?: number;
  rankChange?: number;
}

class GameDataService {
  private readonly PLAYER_PREFIX = "player:";
  private readonly LEADERBOARD_PREFIX = "leaderboard:";
  private readonly GLOBAL_STATS_KEY = "global:stats";

  // Player Profile Management
  async createOrUpdatePlayer(walletAddress: string, playerData: Partial<PlayerProfile>): Promise<PlayerProfile> {
    if (!redis) throw new Error("Redis not configured");

    const playerId = this.getPlayerKey(walletAddress);
    const existingPlayer = await this.getPlayer(walletAddress);
    
    const now = new Date().toISOString();
    const player: PlayerProfile = {
      id: walletAddress,
      name: playerData.name || existingPlayer?.name || `Player${walletAddress.slice(-4)}`,
      walletAddress,
      avatar: playerData.avatar || existingPlayer?.avatar || this.generateAvatar(),
      totalScore: playerData.totalScore || existingPlayer?.totalScore || 0,
      levelsCompleted: playerData.levelsCompleted || existingPlayer?.levelsCompleted || 0,
      bestLevel: playerData.bestLevel || existingPlayer?.bestLevel || 0,
      createdAt: existingPlayer?.createdAt || now,
      lastActive: now,
    };

    // Convert player object to Redis-compatible format
    const redisPlayerData: Record<string, string | number> = {
      id: player.id,
      name: player.name,
      walletAddress: player.walletAddress,
      avatar: player.avatar,
      totalScore: player.totalScore,
      levelsCompleted: player.levelsCompleted,
      bestLevel: player.bestLevel,
      createdAt: player.createdAt,
      lastActive: player.lastActive,
    };

    await redis.hset(playerId, redisPlayerData);
    await this.updateGlobalStats();
    
    return player;
  }

  async getPlayer(walletAddress: string): Promise<PlayerProfile | null> {
    if (!redis) return null;

    const playerId = this.getPlayerKey(walletAddress);
    const playerData = await redis.hgetall(playerId) as Record<string, string>;

    if (!playerData || Object.keys(playerData).length === 0) {
      return null;
    }

    const player: PlayerProfile = {
      id: playerData.id || walletAddress,
      name: playerData.name || `Player${walletAddress.slice(-4)}`,
      walletAddress: playerData.walletAddress || walletAddress,
      avatar: playerData.avatar || this.generateAvatar(),
      totalScore: parseInt(playerData.totalScore) || 0,
      levelsCompleted: parseInt(playerData.levelsCompleted) || 0,
      bestLevel: parseInt(playerData.bestLevel) || 1,
      createdAt: playerData.createdAt || new Date().toISOString(),
      lastActive: playerData.lastActive || new Date().toISOString()
    };

    return player;
  }

  async checkNameAvailability(name: string, currentWalletAddress?: string): Promise<boolean> {
    if (!redis) return false;

    // Get all player keys (exclude progress, settings, etc.)
    const allKeys = await redis.keys(`${this.PLAYER_PREFIX}*`);
    const playerKeys = allKeys.filter(key => 
      !key.includes(':progress') && 
      !key.includes(':settings') && 
      !key.includes(':leaderboard')
    );
    
    // Check each player's name
    for (const key of playerKeys) {
      try {
        const playerData = await redis.hgetall(key) as Record<string, string>;
        if (playerData.name && playerData.name.toLowerCase() === name.toLowerCase()) {
          // If this is the current user's wallet, allow the name
          if (currentWalletAddress && playerData.walletAddress === currentWalletAddress) {
            continue;
          }
          return false; // Name is taken by another player
        }
      } catch (error) {
        // Skip keys that aren't hash types (shouldn't happen with filtering, but safety check)
        console.warn(`Skipping invalid key ${key}:`, error);
        continue;
      }
    }
    
    return true; // Name is available
  }

  async updatePlayerName(walletAddress: string, name: string): Promise<void> {
    if (!redis) return;

    // Check if name is available
    const isAvailable = await this.checkNameAvailability(name, walletAddress);
    if (!isAvailable) {
      throw new Error('Name is already taken by another player');
    }

    // Update player profile
    const playerId = this.getPlayerKey(walletAddress);
    await redis.hset(playerId, { name, lastActive: new Date().toISOString() });

    // Update leaderboard entries for this player
    await this.updateLeaderboardPlayerName(walletAddress, name);
  }

  private async updateLeaderboardPlayerName(walletAddress: string, newName: string): Promise<void> {
    if (!redis) return;

    const currentDate = new Date();
    const weekKey = this.getWeekKey(currentDate);
    const monthKey = this.getMonthKey(currentDate);

    const leaderboardKeys = [
      `${this.LEADERBOARD_PREFIX}all-time`,
      `${this.LEADERBOARD_PREFIX}week:${weekKey}`,
      `${this.LEADERBOARD_PREFIX}month:${monthKey}`
    ];

    for (const leaderboardKey of leaderboardKeys) {
      try {
        // Get all entries from this leaderboard
        const entries = await redis.zrange(leaderboardKey, 0, -1, { withScores: true });
        
        for (let i = 0; i < entries.length; i += 2) {
          const memberData = typeof entries[i] === 'string' 
            ? JSON.parse(entries[i] as string)
            : entries[i];
          
          // If this entry belongs to the player whose name we're updating
          if (memberData.playerId === walletAddress) {
            const score = entries[i + 1] as number;
            
            // Remove old entry
            await redis.zrem(leaderboardKey, entries[i]);
            
            // Add updated entry with new name
            const updatedPlayerData = {
              ...memberData,
              name: newName
            };
            
            await redis.zadd(leaderboardKey, {
              score: score,
              member: JSON.stringify(updatedPlayerData)
            });
            
            break; // Found and updated the player, move to next leaderboard
          }
        }
      } catch (error) {
        console.warn(`Failed to update leaderboard ${leaderboardKey}:`, error);
        // Continue with other leaderboards even if one fails
      }
    }
  }

  // Game Progress Management
  async saveGameProgress(walletAddress: string, progress: LevelProgress[]): Promise<void> {
    if (!redis) return;

    const playerId = this.getPlayerKey(walletAddress);
    const progressKey = `${playerId}:progress`;
    
    // Calculate stats from progress - USE BEST SCORES ONLY for total score
    const totalScore = progress.reduce((sum, level) => sum + (level.bestScore || level.score), 0);
    const levelsCompleted = progress.filter(level => level.completed).length;
    // Extract numeric part from levelId strings (e.g., "africa-1" -> 1)
    const bestLevel = Math.max(...progress.map(level => {
      const match = level.levelId.match(/-(\d+)$/);
      return match ? parseInt(match[1]) : 1;
    }), 0);

    console.log(`💯 [GameDataService] Calculating player stats:`, {
      totalScore,
      levelsCompleted,
      bestLevel,
      progressCount: progress.length
    });

    // Save progress
    await redis.set(progressKey, JSON.stringify(progress));
    
    // Update player stats
    await redis.hset(playerId, {
      totalScore,
      levelsCompleted,
      bestLevel,
      lastActive: new Date().toISOString()
    });
    
    // Update leaderboard
    await this.updateLeaderboards(walletAddress, totalScore, levelsCompleted, bestLevel);
    
    // Update global stats after leaderboard changes
    await this.updateGlobalStats();
  }

  async getGameProgress(walletAddress: string): Promise<LevelProgress[]> {
    if (!redis) return [];

    const playerId = this.getPlayerKey(walletAddress);
    const progressKey = `${playerId}:progress`;
    
    const progressData = await redis.get(progressKey);
    
    if (!progressData) {
      return [];
    }
    
    try {
      // Redis returns the data already parsed as objects, no need to JSON.parse
      const parsed = typeof progressData === 'string' 
        ? JSON.parse(progressData)
        : progressData as LevelProgress[];
        
      return parsed;
    } catch (error) {
      console.error('Failed to parse progress data:', error);
      return [];
    }
  }

  // Settings Management
  async savePlayerSettings(walletAddress: string, settings: PlayerSettings): Promise<void> {
    if (!redis) return;

    const playerId = this.getPlayerKey(walletAddress);
    const settingsKey = `${playerId}:settings`;
    
    await redis.set(settingsKey, JSON.stringify(settings));
  }

  async getPlayerSettings(walletAddress: string): Promise<PlayerSettings | null> {
    if (!redis) return null;

    const playerId = this.getPlayerKey(walletAddress);
    const settingsKey = `${playerId}:settings`;
    
    const settings = await redis.get(settingsKey);
    
    if (!settings) {
      return null;
    }
    
    try {
      // Handle both string and object responses from Upstash Redis
      let parsed;
      if (typeof settings === 'string') {
        parsed = JSON.parse(settings);
      } else if (typeof settings === 'object' && settings !== null) {
        // Upstash sometimes returns objects directly
        parsed = settings;
      } else {
        return null;
      }
      
      return parsed as PlayerSettings;
    } catch (error) {
      console.error('Failed to parse settings:', error);
      return null;
    }
  }

  // Leaderboard Management
  private async updateLeaderboards(walletAddress: string, totalScore: number, levelsCompleted: number, bestLevel: number): Promise<void> {
    if (!redis) return;

    console.log(`🏆 [GameDataService] Updating leaderboards for ${walletAddress} with score ${totalScore}`);

    const player = await this.getPlayer(walletAddress);
    if (!player) return;

    // Update different leaderboard timeframes
    const now = new Date();
    const weekKey = this.getWeekKey(now);
    const monthKey = this.getMonthKey(now);

    const playerData = {
      playerId: walletAddress,
      name: player.name,
      avatar: player.avatar,
      score: totalScore,
      levelsCompleted,
      bestLevel
    };
    const playerDataJson = JSON.stringify(playerData);

    const leaderboardKeys = [
      `${this.LEADERBOARD_PREFIX}all-time`,
      `${this.LEADERBOARD_PREFIX}week:${weekKey}`,
      `${this.LEADERBOARD_PREFIX}month:${monthKey}`
    ];

    // Remove old entries and add new ones for each leaderboard
    for (const leaderboardKey of leaderboardKeys) {
      // Remove any existing entries for this player
      await this.removePlayerFromLeaderboard(leaderboardKey, walletAddress);
      
      // Double-check: remove any remaining entries (defensive programming)
      await this.removePlayerFromLeaderboard(leaderboardKey, walletAddress);
      
      // Add the new entry
      await redis.zadd(leaderboardKey, {
        score: totalScore,
        member: playerDataJson
      });
    }

    // Set expiration for time-based leaderboards
    await redis.expire(`${this.LEADERBOARD_PREFIX}week:${weekKey}`, 60 * 60 * 24 * 14); // 2 weeks
    await redis.expire(`${this.LEADERBOARD_PREFIX}month:${monthKey}`, 60 * 60 * 24 * 60); // 2 months
  }

  private async removePlayerFromLeaderboard(leaderboardKey: string, walletAddress: string): Promise<void> {
    if (!redis) return;

    try {
      // Get all entries from this leaderboard (members only, no scores)
      const entries = await redis.zrange(leaderboardKey, 0, -1);
      
      for (const entry of entries) {
        try {
          const memberData = typeof entry === 'string' 
            ? JSON.parse(entry as string)
            : entry;
          
          // If this entry belongs to the player we want to remove
          if (memberData.playerId === walletAddress) {
            await redis.zrem(leaderboardKey, entry);
          }
        } catch (parseError) {
          // Skip invalid entries
          console.warn(`Failed to parse leaderboard entry:`, parseError);
        }
      }
    } catch (error) {
      console.warn(`Failed to remove player from leaderboard ${leaderboardKey}:`, error);
    }
  }

  async getLeaderboard(timeframe: 'week' | 'month' | 'all-time', limit: number = 50): Promise<LeaderboardEntry[]> {
    if (!redis) return [];

    const key = timeframe === 'week' 
      ? `${this.LEADERBOARD_PREFIX}week:${this.getWeekKey(new Date())}`
      : timeframe === 'month'
      ? `${this.LEADERBOARD_PREFIX}month:${this.getMonthKey(new Date())}`
      : `${this.LEADERBOARD_PREFIX}all-time`;

    const results = await redis.zrange(key, 0, limit - 1, { withScores: true, rev: true });
    
    const leaderboard: LeaderboardEntry[] = [];
    for (let i = 0; i < results.length; i += 2) {
      try {
        // Redis returns the data already parsed as objects, no need to JSON.parse
        const memberData = typeof results[i] === 'string' 
          ? JSON.parse(results[i] as string)
          : results[i] as Omit<LeaderboardEntry, 'rank' | 'rankChange'>;
          
        leaderboard.push({
          ...memberData,
          rank: Math.floor(i / 2) + 1,
          rankChange: 0 // TODO: Calculate rank changes
        });
      } catch (e) {
        console.error('Failed to parse leaderboard entry:', results[i], 'Error:', e);
      }
    }

    return leaderboard;
  }

  async getPlayerRank(walletAddress: string, timeframe: 'week' | 'month' | 'all-time'): Promise<number> {
    if (!redis) return 0;
    
    // Get the leaderboard to find the player's rank
    const leaderboard = await this.getLeaderboard(timeframe, 1000); // Get a large number to find the player
    
    // Find the player in the leaderboard by wallet address
    const playerEntry = leaderboard.find(entry => entry.playerId === walletAddress);
    
    if (!playerEntry) {
      return 0;
    }
    
    return playerEntry.rank ?? 0;
  }

  // Global Statistics
  async updateGlobalStats(): Promise<void> {
    if (!redis) return;
    
    // Count total players from all-time leaderboard
    const totalPlayers = await redis.zcard(`${this.LEADERBOARD_PREFIX}all-time`);
    
    // Get top score from all-time leaderboard
    const topScoreResult = await redis.zrange(`${this.LEADERBOARD_PREFIX}all-time`, -1, -1, { withScores: true });
    const topScore = topScoreResult.length >= 2 ? topScoreResult[1] as number : 0;
    
    // Calculate total rewards based on player count and activity
    // Simple formula: base reward pool + bonus per player
    const baseRewardPool = 1.0; // 1 ETH base
    const rewardPerPlayer = 0.01; // 0.01 ETH per player
    const totalRewards = (baseRewardPool + (totalPlayers * rewardPerPlayer)).toFixed(3);
    
    const stats = {
      totalPlayers,
      topScore,
      totalRewards,
      lastUpdated: new Date().toISOString()
    };
    
    await redis.hset('global:stats', stats);
  }

  async getGlobalStats(): Promise<{ totalPlayers: number; topScore: number; totalRewards: string; lastUpdated: string }> {
    if (!redis) {
      return { totalPlayers: 0, topScore: 0, totalRewards: "0.000", lastUpdated: new Date().toISOString() };
    }

    const stats = await redis.hgetall('global:stats') as Record<string, string>;
    
    if (!stats || Object.keys(stats).length === 0) {
      return { totalPlayers: 0, topScore: 0, totalRewards: "0.000", lastUpdated: new Date().toISOString() };
    }
    
    return {
      totalPlayers: parseInt(stats.totalPlayers) || 0,
      topScore: parseInt(stats.topScore) || 0,
      totalRewards: stats.totalRewards || "0.000",
      lastUpdated: stats.lastUpdated || new Date().toISOString()
    };
  }

  // Utility Methods
  private getPlayerKey(walletAddress: string): string {
    return `${this.PLAYER_PREFIX}${walletAddress}`;
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week}`;
  }

  private getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    // Use ISO 8601 week numbering (Monday = start of week)
    // This ensures weeks always start on Monday and are consistent
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7; // Make Monday = 0
    target.setDate(target.getDate() - dayNr + 3); // Thursday of this week
    const firstThursday = target.valueOf();
    target.setMonth(0, 1); // January 1st
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7); // First Thursday of year
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000
  }

  private generateAvatar(): string {
    const avatars = ['🎮', '🏆', '⭐', '🎯', '🚀', '💎', '🎪', '🎨', '🎭', '🎲'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }


}

export const gameDataService = new GameDataService();
