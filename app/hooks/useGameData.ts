import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { PlayerProfile, LevelProgress, LeaderboardEntry } from '../services/gameDataService';

interface GameDataHook {
  // Player data
  player: PlayerProfile | null;
  progress: LevelProgress[];
  settings: any;
  
  // Loading states
  loading: boolean;
  saving: boolean;
  
  // Actions
  updatePlayerName: (name: string) => Promise<void>;
  saveProgress: (progress: LevelProgress[]) => Promise<void>;
  saveSettings: (settings: any) => Promise<void>;
  loadPlayerData: () => Promise<void>;
  
  // Migration
  migrateFromLocalStorage: () => Promise<void>;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  globalStats: {
    totalPlayers: number;
    totalRewards: string;
    lastUpdated: string;
  };
  playerRank: number | null;
  playerRewards: string;
  timeframe: string;
}

export function useGameData(): GameDataHook {
  const { address, isConnected } = useAccount();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [progress, setProgress] = useState<LevelProgress[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPlayerData = useCallback(async () => {
    if (!address || !isConnected) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/player?address=${address}`);
      if (response.ok) {
        const data = await response.json();
        setPlayer(data.player);
        setProgress(data.progress || []);
        setSettings(data.settings);
        
        // If no player exists, create one
        if (!data.player) {
          await createOrUpdatePlayer({});
        }
      }
    } catch (error) {
      console.error('Failed to load player data:', error);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  const createOrUpdatePlayer = async (playerData: Partial<PlayerProfile>) => {
    if (!address) return;

    try {
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          action: 'createOrUpdate',
          data: playerData
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPlayer(data.player);
      }
    } catch (error) {
      console.error('Failed to create/update player:', error);
    }
  };

  const updatePlayerName = async (name: string) => {
    if (!address) return;

    setSaving(true);
    try {
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          action: 'updateName',
          data: { name }
        })
      });

      if (response.ok) {
        setPlayer(prev => prev ? { ...prev, name } : null);
      }
    } catch (error) {
      console.error('Failed to update player name:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveProgress = async (newProgress: LevelProgress[]) => {
    if (!address) return;

    setSaving(true);
    try {
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          action: 'saveProgress',
          data: { progress: newProgress }
        })
      });

      if (response.ok) {
        setProgress(newProgress);
        
        // Update player stats
        const totalScore = newProgress.reduce((sum, level) => sum + level.score, 0);
        const levelsCompleted = newProgress.filter(level => level.completed).length;
        const bestLevel = Math.max(...newProgress.map(level => level.levelId), 0);
        
        setPlayer(prev => prev ? {
          ...prev,
          totalScore,
          levelsCompleted,
          bestLevel
        } : null);
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (newSettings: any) => {
    if (!address) return;

    setSaving(true);
    try {
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          action: 'saveSettings',
          data: { settings: newSettings }
        })
      });

      if (response.ok) {
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const migrateFromLocalStorage = async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          action: 'migrate'
        })
      });

      if (response.ok) {
        // Reload data after migration
        await loadPlayerData();
      }
    } catch (error) {
      console.error('Failed to migrate from localStorage:', error);
    }
  };

  // Load player data when wallet connects
  useEffect(() => {
    if (address && isConnected) {
      loadPlayerData();
    }
  }, [address, isConnected, loadPlayerData]);

  return {
    player,
    progress,
    settings,
    loading,
    saving,
    updatePlayerName,
    saveProgress,
    saveSettings,
    loadPlayerData,
    migrateFromLocalStorage
  };
}

export function useLeaderboard(timeframe: 'week' | 'month' | 'all-time' = 'all-time') {
  const { address } = useAccount();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeframe,
        limit: '50'
      });
      
      if (address) {
        params.append('address', address);
      }

      const response = await fetch(`/api/leaderboard?${params}`);
      if (response.ok) {
        const leaderboardData = await response.json();
        setData(leaderboardData);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [timeframe, address]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return {
    data,
    loading,
    refresh: loadLeaderboard
  };
}
