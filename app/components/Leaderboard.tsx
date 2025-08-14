"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundManager } from "../utils/soundManager";
import { useLeaderboard } from "../hooks/useGameData";

interface LeaderboardProps {
  onClose: () => void;
  currentPlayerScore?: number;
  currentPlayerName?: string;
}

type TimeFilter = 'week' | 'month' | 'all-time';

export function Leaderboard({ onClose, currentPlayerScore = 0, currentPlayerName = "You" }: LeaderboardProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const { data: leaderboardData, loading, refresh } = useLeaderboard(timeFilter);

  const handleTimeFilterChange = (newFilter: TimeFilter) => {
    setTimeFilter(newFilter);
    soundManager.play('click');
  };

  const handleClose = () => {
    soundManager.play('click');
    onClose();
  };

  // Get data from Redis-based leaderboard
  const players = leaderboardData?.leaderboard || [];
  const globalStats = leaderboardData?.globalStats || {
    totalPlayers: 0,
    totalRewards: "0.000",
    lastUpdated: new Date().toISOString()
  };
  const playerRank = leaderboardData?.playerRank || null;
  const playerRewards = leaderboardData?.playerRewards || "0.000";

  return (
    <AnimatePresence>
      <motion.div
        key="leaderboard-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50"
      />
      
      <motion.div
        key="leaderboard-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-[var(--app-card-bg)] rounded-xl border border-[var(--app-card-border)] shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-[var(--app-card-border)] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🏆</span>
              <h2 className="text-lg font-bold text-[var(--app-foreground)]">Leaderboard</h2>
            </div>
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1 rounded-lg hover:bg-[var(--app-gray)] transition-colors"
            >
              <span className="text-xl">✕</span>
            </motion.button>
          </div>

          {/* Time Filter Tabs */}
          <div className="p-4 border-b border-[var(--app-card-border)]">
            <div className="flex space-x-1 bg-[var(--app-gray)] rounded-lg p-1">
              {(['week', 'month', 'all-time'] as TimeFilter[]).map((filter) => (
                <motion.button
                  key={filter}
                  onClick={() => handleTimeFilterChange(filter)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    timeFilter === filter
                      ? 'bg-[var(--app-accent)] text-white shadow-sm'
                      : 'text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]'
                  }`}
                >
                  {filter === 'all-time' ? 'All Time' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="p-4 border-b border-[var(--app-card-border)]">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--app-background)] rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-[var(--app-foreground)]">{globalStats.totalPlayers}</div>
                <div className="text-xs text-[var(--app-foreground-muted)]">Total Players</div>
              </div>
              <div className="bg-[var(--app-background)] rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-[var(--app-foreground)]">{globalStats.totalRewards} ETH</div>
                <div className="text-xs text-[var(--app-foreground-muted)]">Total Rewards</div>
              </div>
              <div className="bg-[var(--app-background)] rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-[var(--app-foreground)]">#{playerRank || '—'}</div>
                <div className="text-xs text-[var(--app-foreground-muted)]">Your Rank</div>
              </div>
              <div className="bg-[var(--app-background)] rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-[var(--app-foreground)]">{playerRewards} ETH</div>
                <div className="text-xs text-[var(--app-foreground-muted)]">Your Rewards</div>
              </div>
            </div>
          </div>

          {/* Leaderboard List */}
          <div className="flex-1 overflow-y-auto max-h-96">
            {loading ? (
              <div className="p-8 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-[var(--app-accent)] border-t-transparent rounded-full mx-auto mb-2"
                />
                <div className="text-[var(--app-foreground-muted)]">Loading leaderboard...</div>
              </div>
            ) : players.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🎮</div>
                <div className="text-[var(--app-foreground-muted)]">No players yet. Be the first!</div>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {players.slice(0, 10).map((player, index) => (
                  <motion.div
                    key={player.playerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center space-x-3 p-3 rounded-lg ${
                      player.name === currentPlayerName 
                        ? 'bg-[var(--app-accent)] bg-opacity-10 border border-[var(--app-accent)] border-opacity-30'
                        : 'bg-[var(--app-background)] hover:bg-[var(--app-gray)]'
                    } transition-colors`}
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 text-center">
                      {(player.rank || 0) <= 3 ? (
                        <span className="text-lg">
                          {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-[var(--app-foreground-muted)]">
                          #{player.rank || 0}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-[var(--app-gray)] flex items-center justify-center text-lg">
                        {player.avatar}
                      </div>
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-[var(--app-foreground)] truncate">
                          {player.name}
                          {player.name === currentPlayerName && (
                            <span className="ml-2 px-2 py-0.5 bg-[var(--app-accent)] text-white text-xs rounded-full">
                              YOU
                            </span>
                          )}
                        </div>
                        {player.levelsCompleted >= 5 && (
                          <span className="text-sm">👑</span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--app-foreground-muted)]">
                        {player.levelsCompleted} levels • Level {player.bestLevel}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <div className="font-bold text-[var(--app-foreground)]">
                        {player.score.toLocaleString()}
                      </div>
                      {player.rankChange !== undefined && player.rankChange !== 0 && (
                        <div className={`text-xs ${player.rankChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {player.rankChange > 0 ? '↗' : '↘'} {Math.abs(player.rankChange)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
