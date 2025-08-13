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
    if (!redis) throw new Error('Redis not configured');

    const playerId = this.getPlayerKey(walletAddress);
    const rawPlayer = await redis.hgetall(playerId) as Record<string, string>;
    
    if (!rawPlayer || Object.keys(rawPlayer).length === 0) return null;
    
    // Convert Redis string values back to proper types
    const player: PlayerProfile = {
      id: rawPlayer.id,
      name: rawPlayer.name,
      walletAddress: rawPlayer.walletAddress,
      avatar: rawPlayer.avatar,
      totalScore: parseInt(rawPlayer.totalScore) || 0,
      levelsCompleted: parseInt(rawPlayer.levelsCompleted) || 0,
      bestLevel: parseInt(rawPlayer.bestLevel) || 0,
      createdAt: rawPlayer.createdAt,
      lastActive: rawPlayer.lastActive,
    };
    
    return player;
  }

  async updatePlayerName(walletAddress: string, name: string): Promise<void> {
    if (!redis) return;

    const playerId = this.getPlayerKey(walletAddress);
    await redis.hset(playerId, { 
      name, 
      lastActive: new Date().toISOString() 
    });
  }

  // Game Progress Management
  async saveGameProgress(walletAddress: string, progress: LevelProgress[]): Promise<void> {
    if (!redis) {
      console.log('❌ Redis: Redis client not available for saving progress');
      return;
    }

    console.log('💾 Redis: Saving game progress for:', walletAddress);
    console.log('📊 Redis: Progress data to save:', progress);

    const playerId = this.getPlayerKey(walletAddress);
    const progressKey = `${playerId}:progress`;
    console.log('🔑 Redis: Using progress key:', progressKey);
    
    // Calculate stats from progress
    const totalScore = progress.reduce((sum, level) => sum + level.score, 0);
    const levelsCompleted = progress.filter(level => level.completed).length;
    // Extract numeric part from levelId strings (e.g., "africa-1" -> 1)
    const bestLevel = Math.max(...progress.map(level => {
      const match = level.levelId.match(/-(\d+)$/);
      return match ? parseInt(match[1]) : 1;
    }), 0);

    console.log('📈 Redis: Calculated stats - Score:', totalScore, 'Levels:', levelsCompleted, 'Best:', bestLevel);

    // Save progress
    const progressJson = JSON.stringify(progress);
    console.log('💾 Redis: Saving progress JSON:', progressJson);
    await redis.set(progressKey, progressJson);
    console.log('✅ Redis: Progress saved to key:', progressKey);
    
    // Update player stats
    const playerStats = {
      totalScore,
      levelsCompleted,
      bestLevel,
      lastActive: new Date().toISOString()
    };
    console.log('👤 Redis: Updating player stats:', playerStats);
    await redis.hset(playerId, playerStats);
    console.log('✅ Redis: Player stats updated');
    
    // Update leaderboard
    console.log('🏆 Redis: Updating leaderboard for score:', totalScore);
    await this.updateLeaderboards(walletAddress, totalScore, levelsCompleted, bestLevel);
    console.log('✅ Redis: Leaderboard updated');
  }

  async getGameProgress(walletAddress: string): Promise<LevelProgress[]> {
    if (!redis) {
      console.log('❌ Redis: Redis client not available for progress');
      return [];
    }

    const playerId = this.getPlayerKey(walletAddress);
    const progressKey = `${playerId}:progress`;
    console.log('🔍 Redis: Getting progress with key:', progressKey);
    console.log('🔍 Redis: Player ID generated:', playerId);
    
    // Let's also check if the key exists at all
    const keyExists = await redis.exists(progressKey);
    console.log('🔍 Redis: Progress key exists?', keyExists);
    
    const progressData = await redis.get(progressKey);
    console.log('📊 Redis: Raw progress data:', progressData);
    console.log('📊 Redis: Progress data type:', typeof progressData);
    
    if (!progressData) {
      console.log('❌ Redis: No progress found for address:', walletAddress);
      
      // Let's also check what keys exist for this player
      const allKeys = await redis.keys(`${playerId}*`);
      console.log('🔍 Redis: All keys for player:', allKeys);
      
      return [];
    }
    
    try {
      // Redis returns the data already parsed as objects, no need to JSON.parse
      const parsed = typeof progressData === 'string' 
        ? JSON.parse(progressData)
        : progressData as LevelProgress[];
        
      console.log('✅ Redis: Parsed progress data:', parsed);
      console.log('✅ Redis: Progress array length:', parsed.length);
      return parsed;
    } catch (error) {
      console.error('❌ Redis: Failed to parse progress data:', error);
      return [];
    }
  }

  // Settings Management
  async savePlayerSettings(walletAddress: string, settings: any): Promise<void> {
    if (!redis) return;

    const playerId = this.getPlayerKey(walletAddress);
    const settingsKey = `${playerId}:settings`;
    
    await redis.set(settingsKey, JSON.stringify(settings));
  }

  async getPlayerSettings(walletAddress: string): Promise<any> {
    if (!redis) return null;

    const playerId = this.getPlayerKey(walletAddress);
    const settingsKey = `${playerId}:settings`;
    
    const settings = await redis.get(settingsKey);
    if (!settings) return null;
    
    try {
      return JSON.parse(settings as string);
    } catch {
      return null;
    }
  }

  // Leaderboard Management
  async updateLeaderboards(walletAddress: string, totalScore: number, levelsCompleted: number, bestLevel: number): Promise<void> {
    if (!redis) {
      console.log('❌ Redis: Redis client not available for leaderboard update');
      return;
    }

    console.log('🏆 Redis: Updating leaderboards for:', walletAddress, 'Score:', totalScore);
    const player = await this.getPlayer(walletAddress);
    if (!player) {
      console.log('❌ Redis: Player not found for leaderboard update:', walletAddress);
      return;
    }

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
    console.log('📊 Redis: Player data for leaderboard:', playerDataJson);

    // All-time leaderboard
    const allTimeKey = `${this.LEADERBOARD_PREFIX}all-time`;
    console.log('🏆 Redis: Adding to all-time leaderboard:', allTimeKey);
    await redis.zadd(allTimeKey, {
      score: totalScore,
      member: playerDataJson
    });

    // Weekly leaderboard
    const weeklyKey = `${this.LEADERBOARD_PREFIX}week:${weekKey}`;
    console.log('📅 Redis: Adding to weekly leaderboard:', weeklyKey);
    await redis.zadd(weeklyKey, {
      score: totalScore,
      member: playerDataJson
    });

    // Monthly leaderboard
    const monthlyKey = `${this.LEADERBOARD_PREFIX}month:${monthKey}`;
    console.log('📅 Redis: Adding to monthly leaderboard:', monthlyKey);
    await redis.zadd(monthlyKey, {
      score: totalScore,
      member: playerDataJson
    });

    // Set expiration for time-based leaderboards
    await redis.expire(`${this.LEADERBOARD_PREFIX}week:${weekKey}`, 60 * 60 * 24 * 14); // 2 weeks
    await redis.expire(`${this.LEADERBOARD_PREFIX}month:${monthKey}`, 60 * 60 * 24 * 60); // 2 months
    
    // Update global stats after leaderboard changes
    console.log('📊 Redis: Updating global stats after leaderboard update');
    await this.updateGlobalStats();
  }

  async getLeaderboard(timeframe: 'week' | 'month' | 'all-time', limit: number = 50): Promise<LeaderboardEntry[]> {
    if (!redis) {
      console.log('❌ Redis: Redis client not available for leaderboard');
      return [];
    }

    const key = timeframe === 'week' 
      ? `${this.LEADERBOARD_PREFIX}week:${this.getWeekKey(new Date())}`
      : timeframe === 'month'
      ? `${this.LEADERBOARD_PREFIX}month:${this.getMonthKey(new Date())}`
      : `${this.LEADERBOARD_PREFIX}all-time`;

    console.log('🏆 Redis: Getting leaderboard with key:', key);
    const results = await redis.zrange(key, 0, limit - 1, { withScores: true, rev: true });
    console.log('📊 Redis: Raw leaderboard results:', results);
    
    const leaderboard: LeaderboardEntry[] = [];
    for (let i = 0; i < results.length; i += 2) {
      try {
        console.log('🔍 Redis: Processing leaderboard entry:', results[i], 'Type:', typeof results[i]);
        
        // Redis returns the data already parsed as objects, no need to JSON.parse
        const memberData = typeof results[i] === 'string' 
          ? JSON.parse(results[i] as string)
          : results[i] as any;
          
        leaderboard.push({
          ...memberData,
          rank: Math.floor(i / 2) + 1,
          rankChange: 0 // TODO: Calculate rank changes
        });
        console.log('✅ Redis: Successfully processed leaderboard entry for:', memberData.name);
      } catch (e) {
        console.error('❌ Redis: Failed to parse leaderboard entry:', results[i], 'Error:', e);
      }
    }

    console.log('✅ Redis: Processed leaderboard:', leaderboard);
    return leaderboard;
  }

  async getPlayerRank(walletAddress: string, timeframe: 'week' | 'month' | 'all-time'): Promise<number | null> {
    if (!redis) {
      console.log('❌ Redis: Redis client not available for player rank');
      return null;
    }

    const key = timeframe === 'week' 
      ? `${this.LEADERBOARD_PREFIX}week:${this.getWeekKey(new Date())}`
      : timeframe === 'month'
      ? `${this.LEADERBOARD_PREFIX}month:${this.getMonthKey(new Date())}`
      : `${this.LEADERBOARD_PREFIX}all-time`;

    console.log('🏆 Redis: Getting player rank for:', walletAddress, 'from key:', key);
    
    // Get all leaderboard entries to find the player's rank
    const results = await redis.zrange(key, 0, -1, { withScores: true, rev: true });
    console.log('📊 Redis: Got', results.length / 2, 'leaderboard entries for rank calculation');
    
    // Search through the leaderboard to find the player
    for (let i = 0; i < results.length; i += 2) {
      try {
        const memberData = typeof results[i] === 'string' 
          ? JSON.parse(results[i] as string)
          : results[i] as any;
          
        if (memberData.playerId === walletAddress) {
          const rank = Math.floor(i / 2) + 1;
          console.log('✅ Redis: Found player rank:', rank);
          return rank;
        }
      } catch (e) {
        console.error('❌ Redis: Error parsing leaderboard entry for rank:', e);
      }
    }
    
    console.log('❌ Redis: Player not found in leaderboard');
    return null;
  }

  // Global Statistics
  async updateGlobalStats(): Promise<void> {
    if (!redis) {
      console.log('❌ Redis: Redis client not available for global stats update');
      return;
    }

    const leaderboardKey = `${this.LEADERBOARD_PREFIX}all-time`;
    console.log('📊 Redis: Getting total players from key:', leaderboardKey);
    
    const totalPlayers = await redis.zcard(leaderboardKey);
    console.log('👥 Redis: Total players count:', totalPlayers);
    
    const totalRewards = totalPlayers * 0.001; // Mock ETH calculation
    console.log('💰 Redis: Calculated total rewards:', totalRewards);

    const statsData = {
      totalPlayers,
      totalRewards: totalRewards.toFixed(3),
      lastUpdated: new Date().toISOString()
    };
    
    console.log('📈 Redis: Updating global stats:', statsData);
    await redis.hset(this.GLOBAL_STATS_KEY, statsData);
    console.log('✅ Redis: Global stats updated');
  }

  async getGlobalStats(): Promise<{ totalPlayers: number; totalRewards: string; lastUpdated: string }> {
    if (!redis) throw new Error('Redis not configured');

    console.log('📊 Redis: Getting global stats from key:', this.GLOBAL_STATS_KEY);
    const stats = await redis.hgetall(this.GLOBAL_STATS_KEY) as Record<string, string>;
    console.log('📈 Redis: Raw global stats:', stats);
    
    // If stats don't exist yet, initialize them
    if (!stats || Object.keys(stats).length === 0) {
      console.log('⚠️ Redis: No global stats found, initializing...');
      await this.updateGlobalStats();
      const newStats = await redis.hgetall(this.GLOBAL_STATS_KEY) as Record<string, string>;
      console.log('📈 Redis: New global stats after initialization:', newStats);
      return {
        totalPlayers: parseInt(newStats.totalPlayers) || 0,
        totalRewards: newStats.totalRewards || "0.000",
        lastUpdated: newStats.lastUpdated || new Date().toISOString()
      };
    }

    const result = {
      totalPlayers: parseInt(stats.totalPlayers),
      totalRewards: stats.totalRewards,
      lastUpdated: stats.lastUpdated
    };
    console.log('✅ Redis: Returning global stats:', result);
    return result;
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
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private generateAvatar(): string {
    const avatars = ['🎮', '🏆', '⭐', '🎯', '🚀', '💎', '🎪', '🎨', '🎭', '🎲'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }


}

export const gameDataService = new GameDataService();
