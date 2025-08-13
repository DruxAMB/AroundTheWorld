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
    if (!redis) return;

    const playerId = this.getPlayerKey(walletAddress);
    const progressKey = `${playerId}:progress`;
    
    // Calculate stats from progress
    const totalScore = progress.reduce((sum, level) => sum + level.score, 0);
    const levelsCompleted = progress.filter(level => level.completed).length;
    // Extract numeric part from levelId strings (e.g., "africa-1" -> 1)
    const bestLevel = Math.max(...progress.map(level => {
      const match = level.levelId.match(/-(\d+)$/);
      return match ? parseInt(match[1]) : 1;
    }), 0);

    // Save progress
    await redis.set(progressKey, JSON.stringify(progress));
    
    // Update player stats
    await redis.hset(playerId, {
      totalScore,
      levelsCompleted,
      bestLevel,
      lastActive: new Date().toISOString()
    });

    // Update leaderboards
    await this.updateLeaderboards(walletAddress, totalScore, levelsCompleted, bestLevel);
  }

  async getGameProgress(walletAddress: string): Promise<LevelProgress[]> {
    if (!redis) return [];

    const playerId = this.getPlayerKey(walletAddress);
    const progressKey = `${playerId}:progress`;
    
    const progressData = await redis.get(progressKey);
    if (!progressData) return [];
    
    try {
      return JSON.parse(progressData as string);
    } catch {
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
    if (!redis) return;

    const player = await this.getPlayer(walletAddress);
    if (!player) return;

    // Update different leaderboard timeframes
    const now = new Date();
    const weekKey = this.getWeekKey(now);
    const monthKey = this.getMonthKey(now);

    // All-time leaderboard
    await redis.zadd(`${this.LEADERBOARD_PREFIX}all-time`, {
      score: totalScore,
      member: JSON.stringify({
        playerId: walletAddress,
        name: player.name,
        avatar: player.avatar,
        score: totalScore,
        levelsCompleted,
        bestLevel
      })
    });

    // Weekly leaderboard
    await redis.zadd(`${this.LEADERBOARD_PREFIX}week:${weekKey}`, {
      score: totalScore,
      member: JSON.stringify({
        playerId: walletAddress,
        name: player.name,
        avatar: player.avatar,
        score: totalScore,
        levelsCompleted,
        bestLevel
      })
    });

    // Monthly leaderboard
    await redis.zadd(`${this.LEADERBOARD_PREFIX}month:${monthKey}`, {
      score: totalScore,
      member: JSON.stringify({
        playerId: walletAddress,
        name: player.name,
        avatar: player.avatar,
        score: totalScore,
        levelsCompleted,
        bestLevel
      })
    });

    // Set expiration for time-based leaderboards
    await redis.expire(`${this.LEADERBOARD_PREFIX}week:${weekKey}`, 60 * 60 * 24 * 14); // 2 weeks
    await redis.expire(`${this.LEADERBOARD_PREFIX}month:${monthKey}`, 60 * 60 * 24 * 60); // 2 months
  }

  async getLeaderboard(timeframe: 'week' | 'month' | 'all-time', limit: number = 50): Promise<LeaderboardEntry[]> {
    if (!redis) return [];

    let key: string;
    const now = new Date();

    switch (timeframe) {
      case 'week':
        key = `${this.LEADERBOARD_PREFIX}week:${this.getWeekKey(now)}`;
        break;
      case 'month':
        key = `${this.LEADERBOARD_PREFIX}month:${this.getMonthKey(now)}`;
        break;
      case 'all-time':
        key = `${this.LEADERBOARD_PREFIX}all-time`;
        break;
    }

    const results = await redis.zrange(key, 0, limit - 1, { withScores: true, rev: true });
    
    const leaderboard: LeaderboardEntry[] = [];
    for (let i = 0; i < results.length; i += 2) {
      try {
        const memberData = JSON.parse(results[i] as string);
        leaderboard.push({
          ...memberData,
          rank: Math.floor(i / 2) + 1,
          rankChange: 0 // TODO: Calculate rank changes
        });
      } catch (e) {
        console.warn('Failed to parse leaderboard entry:', e);
      }
    }

    return leaderboard;
  }

  async getPlayerRank(walletAddress: string, timeframe: 'week' | 'month' | 'all-time'): Promise<number | null> {
    if (!redis) return null;

    let key: string;
    const now = new Date();

    switch (timeframe) {
      case 'week':
        key = `${this.LEADERBOARD_PREFIX}week:${this.getWeekKey(now)}`;
        break;
      case 'month':
        key = `${this.LEADERBOARD_PREFIX}month:${this.getMonthKey(now)}`;
        break;
      case 'all-time':
        key = `${this.LEADERBOARD_PREFIX}all-time`;
        break;
    }

    const rank = await redis.zrevrank(key, walletAddress);
    return rank !== null ? rank + 1 : null;
  }

  // Global Statistics
  async updateGlobalStats(): Promise<void> {
    if (!redis) return;

    const totalPlayers = await redis.zcard(`${this.LEADERBOARD_PREFIX}all-time`);
    const totalRewards = totalPlayers * 0.001; // Mock ETH calculation

    await redis.hset(this.GLOBAL_STATS_KEY, {
      totalPlayers,
      totalRewards: totalRewards.toFixed(3),
      lastUpdated: new Date().toISOString()
    });
  }

  async getGlobalStats(): Promise<{ totalPlayers: number; totalRewards: string; lastUpdated: string }> {
    if (!redis) throw new Error('Redis not configured');

    const stats = await redis.hgetall(this.GLOBAL_STATS_KEY) as Record<string, string>;
    
    // If stats don't exist yet, initialize them
    if (!stats || Object.keys(stats).length === 0) {
      await this.updateGlobalStats();
      const newStats = await redis.hgetall(this.GLOBAL_STATS_KEY) as Record<string, string>;
      return {
        totalPlayers: parseInt(newStats.totalPlayers) || 0,
        totalRewards: newStats.totalRewards || "0.000",
        lastUpdated: newStats.lastUpdated || new Date().toISOString()
      };
    }

    return {
      totalPlayers: parseInt(stats.totalPlayers),
      totalRewards: stats.totalRewards,
      lastUpdated: stats.lastUpdated
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
