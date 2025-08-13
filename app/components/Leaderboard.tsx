"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Player {
  id: string;
  name: string;
  avatar: string;
  totalScore: number;
  levelsCompleted: number;
  bestLevel: string;
  lastPlayed: Date;
  weeklyScore: number;
  rank: number;
}

interface LeaderboardProps {
  onClose: () => void;
  currentPlayerScore?: number;
  currentPlayerName?: string;
}

type TimeFilter = 'week' | 'month' | 'alltime';

export function Leaderboard({ onClose, currentPlayerScore = 0, currentPlayerName = "You" }: LeaderboardProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  // Mock data - in a real app, this would come from a backend
  useEffect(() => {
    const mockPlayers: Player[] = [
      {
        id: "1",
        name: "Alex Chen",
        avatar: "🧑‍💻",
        totalScore: 15420,
        levelsCompleted: 5,
        bestLevel: "Europe",
        lastPlayed: new Date(),
        weeklyScore: 8500,
        rank: 1
      },
      {
        id: "2", 
        name: "Maria Garcia",
        avatar: "👩‍🎨",
        totalScore: 12800,
        levelsCompleted: 4,
        bestLevel: "Latin America",
        lastPlayed: new Date(Date.now() - 86400000),
        weeklyScore: 7200,
        rank: 2
      },
      {
        id: "3",
        name: "David Kim",
        avatar: "👨‍🚀",
        totalScore: 11500,
        levelsCompleted: 4,
        bestLevel: "Southeast Asia",
        lastPlayed: new Date(Date.now() - 172800000),
        weeklyScore: 6800,
        rank: 3
      },
      {
        id: "4",
        name: "Sarah Johnson",
        avatar: "👩‍🔬",
        totalScore: 9200,
        levelsCompleted: 3,
        bestLevel: "India",
        lastPlayed: new Date(Date.now() - 259200000),
        weeklyScore: 5100,
        rank: 4
      },
      {
        id: "5",
        name: "Ahmed Hassan",
        avatar: "👨‍🎓",
        totalScore: 8750,
        levelsCompleted: 3,
        bestLevel: "Africa",
        lastPlayed: new Date(Date.now() - 345600000),
        weeklyScore: 4200,
        rank: 5
      }
    ];

    // Add current player if they have a score
    if (currentPlayerScore > 0) {
      const playerRank = mockPlayers.filter(p => p.totalScore > currentPlayerScore).length + 1;
      const currentPlayerData: Player = {
        id: "current",
        name: currentPlayerName,
        avatar: "🎮",
        totalScore: currentPlayerScore,
        levelsCompleted: 1,
        bestLevel: "Africa",
        lastPlayed: new Date(),
        weeklyScore: currentPlayerScore,
        rank: playerRank
      };
      
      mockPlayers.push(currentPlayerData);
      mockPlayers.sort((a, b) => b.totalScore - a.totalScore);
      mockPlayers.forEach((player, index) => {
        player.rank = index + 1;
      });
      
      setCurrentPlayer(currentPlayerData);
    }

    setPlayers(mockPlayers);
  }, [currentPlayerScore, currentPlayerName]);

  const getFilteredPlayers = () => {
    switch (timeFilter) {
      case 'week':
        return players.sort((a, b) => b.weeklyScore - a.weeklyScore);
      case 'month':
        return players.sort((a, b) => b.totalScore - a.totalScore);
      case 'alltime':
        return players.sort((a, b) => b.totalScore - a.totalScore);
      default:
        return players;
    }
  };

  const getScoreForFilter = (player: Player) => {
    switch (timeFilter) {
      case 'week':
        return player.weeklyScore;
      case 'month':
        return Math.floor(player.totalScore * 0.7); // Mock monthly score
      case 'alltime':
        return player.totalScore;
      default:
        return player.totalScore;
    }
  };

  const getTotalRewards = () => {
    const totalPlayers = players.length;
    return `${totalPlayers * 0.05} ETH`; // Mock rewards calculation
  };

  const getCurrentPlayerRewards = () => {
    if (!currentPlayer) return "0 ETH";
    const rank = currentPlayer.rank;
    const reward = Math.max(0.001, 0.1 / rank);
    return `${reward.toFixed(3)} ETH`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return `#${rank}`;
    }
  };

  const getRankChange = (rank: number) => {
    // Mock rank changes
    const changes = [4, 2, 7, -3, 56, -12, 8, -5, 15, -2];
    const change = changes[rank % changes.length] || 0;
    return change;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="flex flex-col h-full max-w-md mx-auto bg-[var(--app-background)] text-[var(--app-foreground)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--app-card-border)]">
        <h1 className="text-xl font-bold">🏆 Leaderboard</h1>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-lg hover:bg-[var(--app-gray)] transition-colors"
        >
          <span className="text-lg">✖️</span>
        </motion.button>
      </div>

      {/* Time Filter Tabs */}
      <div className="flex border-b border-[var(--app-card-border)]">
        {[
          { key: 'week', label: 'This Week' },
          { key: 'month', label: 'This Month' },
          { key: 'alltime', label: 'All Time' }
        ].map((tab) => (
          <motion.button
            key={tab.key}
            onClick={() => setTimeFilter(tab.key as TimeFilter)}
            whileTap={{ scale: 0.98 }}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              timeFilter === tab.key
                ? 'text-[var(--app-accent)] border-b-2 border-[var(--app-accent)]'
                : 'text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]'
            }`}
          >
            {tab.label}
            {tab.key === 'week' && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </motion.button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <div className="bg-[var(--app-card-bg)] rounded-lg p-3 border border-[var(--app-card-border)]">
          <div className="text-xs text-[var(--app-foreground-muted)] mb-1">Total Players</div>
          <div className="text-lg font-bold text-[var(--app-foreground)]">{players.length}</div>
        </div>
        <div className="bg-[var(--app-card-bg)] rounded-lg p-3 border border-[var(--app-card-border)]">
          <div className="text-xs text-[var(--app-foreground-muted)] mb-1">Total Rewards</div>
          <div className="text-lg font-bold text-[var(--app-accent)]">{getTotalRewards()}</div>
        </div>
        <div className="bg-[var(--app-card-bg)] rounded-lg p-3 border border-[var(--app-card-border)]">
          <div className="text-xs text-[var(--app-foreground-muted)] mb-1">Your Rank</div>
          <div className="text-lg font-bold text-[var(--app-foreground)]">
            {currentPlayer ? `#${currentPlayer.rank}` : '--'}
          </div>
        </div>
        <div className="bg-[var(--app-card-bg)] rounded-lg p-3 border border-[var(--app-card-border)]">
          <div className="text-xs text-[var(--app-foreground-muted)] mb-1">Your Rewards</div>
          <div className="text-lg font-bold text-[var(--app-accent)]">{getCurrentPlayerRewards()}</div>
        </div>
      </div>

      {/* Player Rankings */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-2">
          {getFilteredPlayers().slice(0, 10).map((player, index) => {
            const rankChange = getRankChange(player.rank);
            const isCurrentPlayer = player.id === "current";
            
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center p-3 rounded-lg border transition-colors ${
                  isCurrentPlayer
                    ? 'bg-[var(--app-accent)] bg-opacity-10 border-[var(--app-accent)]'
                    : 'bg-[var(--app-card-bg)] border-[var(--app-card-border)] hover:bg-[var(--app-gray)]'
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8 h-8 mr-3">
                  <span className="text-sm font-bold">
                    {getRankIcon(player.rank)}
                  </span>
                </div>

                {/* Rank Change */}
                <div className="flex items-center mr-3">
                  {rankChange > 0 ? (
                    <div className="flex items-center text-green-500 text-xs">
                      <span>↗</span>
                      <span className="ml-1">+{rankChange}</span>
                    </div>
                  ) : rankChange < 0 ? (
                    <div className="flex items-center text-red-500 text-xs">
                      <span>↘</span>
                      <span className="ml-1">{rankChange}</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-500 text-xs">
                      <span>→</span>
                      <span className="ml-1">0</span>
                    </div>
                  )}
                </div>

                {/* Avatar */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--app-gray)] mr-3">
                  <span className="text-lg">{player.avatar}</span>
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium truncate ${
                      isCurrentPlayer ? 'text-[var(--app-accent)]' : 'text-[var(--app-foreground)]'
                    }`}>
                      {player.name}
                    </span>
                    {player.levelsCompleted === 5 && (
                      <span className="text-xs">👑</span>
                    )}
                    {isCurrentPlayer && (
                      <span className="text-xs bg-[var(--app-accent)] text-white px-1 rounded">YOU</span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--app-foreground-muted)]">
                    {player.levelsCompleted}/5 levels • {player.bestLevel}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className={`font-bold ${
                    isCurrentPlayer ? 'text-[var(--app-accent)]' : 'text-[var(--app-foreground)]'
                  }`}>
                    {getScoreForFilter(player).toLocaleString()}
                  </div>
                  <div className="text-xs text-[var(--app-foreground-muted)]">points</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
