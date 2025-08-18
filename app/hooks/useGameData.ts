import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { PlayerProfile, LevelProgress, LeaderboardEntry, PlayerSettings } from '../services/gameDataService';

interface GameDataHook {
  // Player data
  player: PlayerProfile | null;
  progress: LevelProgress[];
  settings: PlayerSettings | null;
  
  // Loading states
  loading: boolean;
  saving: boolean;
  
  // Actions
  updatePlayerName: (name: string) => Promise<void>;
  createOrUpdatePlayer: (playerData: Partial<PlayerProfile>) => Promise<void>;
  checkNameAvailability: (name: string) => Promise<boolean>;
  saveProgress: (progress: LevelProgress[]) => Promise<void>;
  saveSettings: (settings: PlayerSettings) => Promise<void>;
  loadPlayerData: () => Promise<void>;
  refreshPlayerData: () => Promise<void>;
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
  const [settings, setSettings] = useState<PlayerSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const createOrUpdatePlayer = useCallback(async (playerData: Partial<PlayerProfile>) => {
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
  }, [address]);

  const loadPlayerData = useCallback(async () => {
    if (!address || !isConnected) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/player?address=${address}`);
      if (response.ok) {
        const data = await response.json();
        
        setPlayer(data.player);
        setProgress(data.progress || []);
        
        // Only update settings if they contain valid data (not empty object)
        if (data.settings && typeof data.settings === 'object' && Object.keys(data.settings).length > 0) {
          setSettings(data.settings);
        } else if (data.settings === null) {
          setSettings(null);
        }
        
        // If player doesn't exist, create one
        if (!data.player) {
          await createOrUpdatePlayer({});
        }
      }
    } catch (error) {
      console.error('Failed to load player data:', error);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected, createOrUpdatePlayer]);

  const checkNameAvailability = async (name: string): Promise<boolean> => {
    if (!address) return false;

    try {
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          action: 'checkNameAvailability',
          data: { name }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.available;
      }
      return false;
    } catch (error) {
      console.error('Failed to check name availability:', error);
      return false;
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
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update name');
      }
    } catch (error) {
      console.error('Failed to update player name:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const saveProgress = useCallback(async (newProgress: LevelProgress[]) => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }
    
    // Validate progress data
    if (!Array.isArray(newProgress)) {
      throw new Error('Invalid progress data format');
    }
    
    setSaving(true);
    try {
      const response = await fetch('/api/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          action: 'saveProgress',
          data: { progress: newProgress }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Update local state immediately for optimistic updates
      setProgress(newProgress);
      
      // Reload player data to get updated stats (but don't await to prevent blocking)
      loadPlayerData().catch(error => {
        console.warn('Failed to reload player data after progress save:', error);
      });
      
    } catch (error) {
      console.error('Error saving progress:', error);
      throw error; // Re-throw to allow caller to handle
    } finally {
      setSaving(false);
    }
  }, [address, isConnected, loadPlayerData]);

  const saveSettings = async (newSettings: PlayerSettings) => {
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
    createOrUpdatePlayer,
    checkNameAvailability,
    saveProgress,
    saveSettings,
    loadPlayerData,
    refreshPlayerData: loadPlayerData // Expose as refresh function
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
