import { redis } from "../../lib/redis";
import { CompetitiveNotificationService } from "../../lib/competitive-notifications";
import { dailyBonusService } from "../../lib/daily-bonus";

export interface PlayerProfile {
  id: string;
  name: string;
  walletAddress: string;
  avatar?: string;
  fid?: number; // Farcaster ID - used to fetch profile data via API
  totalScore: number;
  levelsCompleted: number;
  bestLevel: number;
  createdAt: string;
  lastActive: string;
  lastWeeklyReset?: string; // When player was last reset for weekly leaderboard
  [key: string]: string | number | undefined; // Index signature for Redis compatibility
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
  soundVolume: number;
  musicEnabled: boolean;
  animationsEnabled: boolean;
  vibrationEnabled: boolean;
  tutorialShown?: boolean;
}

export interface PlayerGameData {
  profile: PlayerProfile;
  progress: LevelProgress[];
  settings: {
    soundEnabled: boolean;
    soundVolume: number;
    musicEnabled: boolean;
    animationsEnabled: boolean;
    vibrationEnabled: boolean;
  };
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  avatar: string;
  fid?: number; // Farcaster ID - used to fetch profile data via API
  score: number;
  levelsCompleted: number;
  bestLevel: number;
  rank?: number;
  rankChange?: number;
  farcasterProfile?: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
    bio: string;
    followerCount: number;
    followingCount: number;
    verifiedAddresses: string[];
  } | null;
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
      fid: playerData.fid || existingPlayer?.fid,
      totalScore: playerData.totalScore || existingPlayer?.totalScore || 0,
      levelsCompleted: playerData.levelsCompleted || existingPlayer?.levelsCompleted || 0,
      bestLevel: playerData.bestLevel || existingPlayer?.bestLevel || 0,
      createdAt: existingPlayer?.createdAt || now,
      lastActive: now,
      lastWeeklyReset: existingPlayer?.lastWeeklyReset,
    };

    // Convert player object to Redis-compatible format
    const redisPlayerData: Record<string, string | number> = {
      id: player.id,
      name: player.name,
      walletAddress: player.walletAddress,
      avatar: player.avatar || this.generateAvatar(), // Provide default if undefined
      totalScore: player.totalScore,
      levelsCompleted: player.levelsCompleted,
      bestLevel: player.bestLevel,
      createdAt: player.createdAt,
      lastActive: player.lastActive,
    };
    
    // Add optional fields only if they exist and are not undefined
    if (player.fid) {
      redisPlayerData.fid = player.fid;
    }
    
    if (player.lastWeeklyReset) {
      redisPlayerData.lastWeeklyReset = player.lastWeeklyReset;
    }

    await redis.hset(playerId, redisPlayerData);
    await this.updateGlobalStats();
    
    return player;
  }

  async getPlayer(walletAddress: string): Promise<PlayerProfile | null> {
    if (!redis) return null;

    try {
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
        fid: playerData.fid ? parseInt(playerData.fid as string) : undefined,
        totalScore: parseInt(playerData.totalScore) || 0,
        levelsCompleted: parseInt(playerData.levelsCompleted) || 0,
        bestLevel: parseInt(playerData.bestLevel) || 1,
        createdAt: playerData.createdAt || new Date().toISOString(),
        lastActive: playerData.lastActive || new Date().toISOString(),
        lastWeeklyReset: playerData.lastWeeklyReset
      };

      return player;
    } catch (error) {
      console.error('Error fetching player data:', error);
      return null;
    }
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
    
    // Get previous scores for comparison
    const previousPlayer = await redis.hgetall(playerId) as PlayerProfile | null;
    const previousScore = previousPlayer?.totalScore || 0;
    
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
      progressCount: progress.length,
      previousScore
    });

    // Save progress
    await redis.set(progressKey, JSON.stringify(progress));
    
    // Update player stats (no weekly score - reset handles this)
    await redis.hset(playerId, {
      totalScore,
      levelsCompleted,
      bestLevel,
      lastActive: new Date().toISOString()
    });
    
    // Update leaderboard
    await this.updateLeaderboards(walletAddress, totalScore, levelsCompleted, bestLevel);
    
    // Trigger competitive notifications if score improved
    if (totalScore > previousScore) {
      await this.triggerCompetitiveNotifications(walletAddress, totalScore, previousScore);
    }
    
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
      fid: player.fid,
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

    try {
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
          // Continue processing other entries instead of failing completely
        }
      }

      return leaderboard;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
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

  // Reward Configuration Management - Directly updates global:stats
  async setRewardConfig(symbol: string, amount: string, description?: string): Promise<void> {
    if (!redis) return;
    
    // Get current global stats
    const currentStats = await this.getGlobalStats();
    
    // Create new stats with updated reward information
    const stats = {
      ...currentStats,
      rewardSymbol: symbol,
      rewardAmount: amount,
      rewardDescription: description || `${amount} ${symbol} reward pool`,
      totalRewards: amount,
      lastUpdated: new Date().toISOString()
    };
    
    // Update global stats directly
    await redis.hset('global:stats', stats);
    
    // For backward compatibility, also update reward:config (can be removed later)
    const config = {
      symbol,
      amount,
      description: description || `${amount} ${symbol} reward pool`,
      lastUpdated: new Date().toISOString()
    };
    await redis.hset('reward:config', config);
  }

  async getRewardConfig(): Promise<{ symbol: string; amount: string; description: string; lastUpdated: string }> {
    if (!redis) {
      return { symbol: 'ETH', amount: '1.000', description: '1.000 ETH reward pool', lastUpdated: new Date().toISOString() };
    }

    try {
      // Get reward data from global:stats (preferred source)
      const globalStats = await this.getGlobalStats();
      
      // Check if global:stats has reward data
      if (globalStats.rewardSymbol && globalStats.rewardAmount) {
        return {
          symbol: globalStats.rewardSymbol,
          amount: globalStats.rewardAmount || globalStats.totalRewards,
          description: globalStats.rewardDescription || `${globalStats.totalRewards} ${globalStats.rewardSymbol} reward pool`,
          lastUpdated: globalStats.lastUpdated
        };
      }
      
      // Fallback to reward:config (legacy support)
      const config = await redis.hgetall('reward:config') as Record<string, string>;
      
      if (!config || Object.keys(config).length === 0) {
        // Set default ETH configuration
        await this.setRewardConfig('ETH', '1.000', '1.000 ETH reward pool');
        return { symbol: 'ETH', amount: '1.000', description: '1.000 ETH reward pool', lastUpdated: new Date().toISOString() };
      }
      
      return {
        symbol: config.symbol || 'ETH',
        amount: config.amount || '1.000',
        description: config.description || `${config.amount} ${config.symbol} reward pool`,
        lastUpdated: config.lastUpdated || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching reward config:', error);
      return { symbol: 'ETH', amount: '1.000', description: '1.000 ETH reward pool', lastUpdated: new Date().toISOString() };
    }
  }

  // Global Statistics
  async updateGlobalStats(): Promise<void> {
    if (!redis) return;
    
    // Count total players from all-time leaderboard
    const totalPlayers = await redis.zcard(`${this.LEADERBOARD_PREFIX}all-time`);
    
    // Get top score from all-time leaderboard
    const topScoreResult = await redis.zrange(`${this.LEADERBOARD_PREFIX}all-time`, -1, -1, { withScores: true });
    const topScore = topScoreResult.length >= 2 ? topScoreResult[1] as number : 0;
    
    // Get current stats first to preserve existing reward data
    const currentStats = await redis.hgetall('global:stats') as Record<string, string>;
    
    // Build stats object with existing reward data or defaults
    const stats = {
      totalPlayers,
      topScore,
      // Preserve existing reward data if available
      rewardSymbol: currentStats.rewardSymbol || 'ETH',
      rewardAmount: currentStats.rewardAmount || currentStats.totalRewards || '1.000',
      rewardDescription: currentStats.rewardDescription || `${currentStats.totalRewards || '1.000'} ${currentStats.rewardSymbol || 'ETH'} reward pool`,
      // For backward compatibility
      totalRewards: currentStats.rewardAmount || currentStats.totalRewards || '1.000',
      lastUpdated: new Date().toISOString()
    };
    
    await redis.hset('global:stats', stats);
  }

  async getGlobalStats(): Promise<{ 
    totalPlayers: number; 
    topScore: number; 
    totalRewards: string; 
    rewardSymbol: string;
    rewardAmount?: string;
    rewardDescription?: string;
    lastUpdated: string 
  }> {
    if (!redis) {
      return { 
        totalPlayers: 0, 
        topScore: 0, 
        totalRewards: "0.000", 
        rewardSymbol: "ETH",
        rewardAmount: "1.000",
        rewardDescription: "1.000 ETH reward pool", 
        lastUpdated: new Date().toISOString() 
      };
    }

    const stats = await redis.hgetall('global:stats') as Record<string, string>;
    
    if (!stats || Object.keys(stats).length === 0) {
      return { 
        totalPlayers: 0, 
        topScore: 0, 
        totalRewards: "0.000", 
        rewardSymbol: "ETH",
        rewardAmount: "1.000",
        rewardDescription: "1.000 ETH reward pool", 
        lastUpdated: new Date().toISOString() 
      };
    }
    
    return {
      totalPlayers: parseInt(stats.totalPlayers) || 0,
      topScore: parseInt(stats.topScore) || 0,
      totalRewards: stats.totalRewards || "0.000",
      rewardSymbol: stats.rewardSymbol || "ETH",
      rewardAmount: stats.rewardAmount || stats.totalRewards || "1.000",
      rewardDescription: stats.rewardDescription || `${stats.totalRewards || "1.000"} ${stats.rewardSymbol || "ETH"} reward pool`,
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

  // Trigger competitive notifications when a player's score improves
  private async triggerCompetitiveNotifications(walletAddress: string, newScore: number, previousScore: number): Promise<void> {
    try {
      // Get player info for notifications
      const player = await this.getPlayer(walletAddress);
      if (!player || !player.fid) {
        console.log('No FID found for player, skipping notifications');
        return;
      }

      const scoreImprovement = newScore - previousScore;
      console.log(`🔔 [GameDataService] Triggering competitive notifications for ${player.name} (FID: ${player.fid}) - Score improved by ${scoreImprovement}`);
      
      // Check if this player's score beat others
      await CompetitiveNotificationService.checkScoreBeaten(newScore, player.fid, player.name, previousScore);
      
    } catch (error) {
      console.error('Error triggering competitive notifications:', error);
    }
  }
  
  async resetLeaderboard(timeframe: 'week' | 'month' | 'all-time'): Promise<{ success: boolean; key: string; playersReset?: number }> {
    if (!redis) return { success: false, key: '' };
    
    try {
      // Import AI agent for automated reward distribution
      const { rewardAgent } = await import('@/lib/reward-agent');
      
      // Trigger AI agent evaluation before reset
      if (timeframe === 'week') {
        console.log('🤖 Triggering AI agent for pre-reset reward evaluation');
        setTimeout(() => {
          rewardAgent.onWeeklyLeaderboardReset();
        }, 1000); // Small delay to ensure reset completes first
      }
      const now = new Date();
      let key: string;
      
      // Determine the key based on timeframe
      if (timeframe === 'week') {
        key = `${this.LEADERBOARD_PREFIX}week:${this.getWeekKey(now)}`;
      } else if (timeframe === 'month') {
        key = `${this.LEADERBOARD_PREFIX}month:${this.getMonthKey(now)}`;
      } else {
        key = `${this.LEADERBOARD_PREFIX}all-time`;
      }
      
      // Only perform full reset for weekly leaderboard
      let playersReset = 0;
      const playersToRestore = [];
      
      if (timeframe === 'week') {
        // Get all entries from the existing leaderboard before deleting it
        const entries = await redis.zrange(key, 0, -1);
        console.log(`🔄 [GameDataService] Resetting ${timeframe} leaderboard with ${entries.length} entries`);
        
        // For each player in the leaderboard, perform complete reset
        for (const entry of entries) {
          try {
            const memberData = typeof entry === 'string' 
              ? JSON.parse(entry as string)
              : entry;
            
            // Skip entries that don't have a playerId
            if (!memberData.playerId) continue;
            
            const playerId = memberData.playerId;
            const playerKey = this.getPlayerKey(playerId);
            
            // Get player data to preserve identity info
            const playerData = await redis.hgetall(playerKey) as PlayerProfile;
            
            if (playerData && Object.keys(playerData).length > 0) {
              // // Create backup of current data
              // const backupKey = `${playerKey}:backup`;
              // await redis.set(backupKey, JSON.stringify(playerData), { ex: 60 * 60 * 24 * 7 }); // 1 week expiry
              
              // COMPLETELY RESET the player profile for weekly leaderboard
              // Only preserve identity info and createdAt timestamp
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const resetPlayerData: Record<string, any> = {
                id: playerData.id,
                name: playerData.name,
                walletAddress: playerData.walletAddress,
                avatar: playerData.avatar,
                totalScore: 0,              // Reset to 0
                levelsCompleted: 0,          // Reset to 0
                bestLevel: 1,                // Reset to 1 (starting level)
                createdAt: playerData.createdAt,
                lastActive: new Date().toISOString(),
                lastWeeklyReset: new Date().toISOString() // Mark when reset happened
              };
              
              // Only add fid if it's not null or undefined
              if (playerData.fid) {
                resetPlayerData.fid = playerData.fid;
              }
              
              // Remove all player data including progress
              await redis.del(playerKey);
              await redis.del(`${playerKey}:progress`);
              
              // Set the reset player data
              await redis.hset(playerKey, resetPlayerData);
              
              // Create leaderboard entry with reset stats
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const resetLeaderboardData: Record<string, any> = {
                playerId: playerId,
                name: playerData.name,
                avatar: playerData.avatar,
                score: 0,                    // Reset score to 0
                levelsCompleted: 0,          // Reset levels completed to 0
                bestLevel: 1                 // Reset best level to 1
              };
              
              // Only add fid if it exists and is not null
              if (playerData.fid) {
                resetLeaderboardData.fid = playerData.fid;
              }
              
              playersToRestore.push(resetLeaderboardData);
              playersReset++;
            }
          } catch (parseError) {
            console.warn(`Failed to parse leaderboard entry:`, parseError);
          }
        }
      }
      // First delete the existing leaderboard
      await redis.del(key);
      
      // If we're resetting a weekly leaderboard, add the players back with completely reset stats
      if (timeframe === 'week' && playersToRestore.length > 0) {
        // Add each player back to the leaderboard with fully reset stats
        for (const playerData of playersToRestore) {
          await redis.zadd(key, {
            score: 0, // Reset score to 0
            member: JSON.stringify(playerData)
          });
        }
      }
      
      console.log(`🔄 [GameDataService] Reset ${timeframe} leaderboard (${key}) and restored ${playersReset} players with completely fresh stats`);
      return { 
        success: true, 
        key,
        ...(playersReset > 0 ? { playersReset } : {})
      };
    } catch (error) {
      console.error(`Error resetting ${timeframe} leaderboard:`, error);
      return { success: false, key: '' };
    }
  }

  private generateAvatar(): string {
    const avatars = ['🎮', '🏆', '⭐', '🎯', '🚀', '💎', '🎪', '🎨', '🎭', '🎲'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }

// ...
  // Daily Bonus Integration
  async checkDailyBonusEligibility(walletAddress: string): Promise<boolean> {
    try {
      return !(await dailyBonusService.hasClaimedToday(walletAddress));
    } catch (error) {
      console.error('Error checking daily bonus eligibility:', error);
      return false;
    }
  }

  async addBonusPoints(walletAddress: string, bonusAmount: number): Promise<PlayerProfile | null> {
    try {
      const player = await this.getPlayer(walletAddress);
      if (!player) return null;

      const updatedPlayer = await this.createOrUpdatePlayer(walletAddress, {
        totalScore: player.totalScore + bonusAmount
      });

      // Update leaderboards with complete player stats
      await this.updateLeaderboards(
        walletAddress, 
        updatedPlayer.totalScore, 
        updatedPlayer.levelsCompleted, 
        updatedPlayer.bestLevel
      );

      return updatedPlayer;
    } catch (error) {
      console.error('Error adding bonus points:', error);
      return null;
    }
  }

}

export const gameDataService = new GameDataService();
