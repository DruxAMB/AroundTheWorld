"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { soundManager } from "../utils/soundManager";
import { useLeaderboard } from "../hooks/useGameData";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";

interface LeaderboardProps {
  onClose: () => void;
  currentPlayerScore?: number;
  currentPlayerName?: string;
}

type TimeFilter = 'week' | 'month' | 'all-time';

export function Leaderboard({ onClose }: LeaderboardProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const { data: leaderboardData, loading } = useLeaderboard(timeFilter);
  const { context } = useMiniKit();
  const { address } = useAccount();
  

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
    rewardSymbol: "ETH",
    lastUpdated: new Date().toISOString()
  };
  const playerRank = leaderboardData?.playerRank || null;
  const playerRewards = leaderboardData?.playerRewards || "0.000";
  const rewardSymbol = leaderboardData?.rewardConfig?.symbol || globalStats.rewardSymbol || "ETH";

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
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="no-scrollbar bg-[var(--app-card-bg)] shadow-2xl max-w-lg w-full h-screen overflow-y-scroll">
          {/* Header */}
          <div className="p-4 border-b border-[var(--app-card-border)] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🏆</span>
              <h2 className="text-lg font-bold text-[var(--app-foreground)]">Leaderboard</h2>
              <div className="group relative">
                <span className="text-sm cursor-help text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-colors">
                  ❔
                </span>
                <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-[var(--app-background)] rounded-lg shadow-lg border border-[var(--app-card-border)] z-10 transform scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all origin-top-left duration-200">
                  <h4 className="font-bold text-sm mb-1">Reward Distribution</h4>
                  <div className="text-xs space-y-1">
                    <div><span className="font-medium">🥇 1st place:</span> 20%</div>
                    <div><span className="font-medium">🥈 2nd place:</span> 15%</div>
                    <div><span className="font-medium">🥈 3rd place:</span> 10%</div>
                    <div><span className="font-medium">🥉 4-6th place:</span> 8% each</div>
                    <div><span className="font-medium">🏆 7-8th place:</span> 6% each</div>
                    <div><span className="font-medium">🏆 9-10th place:</span> 4% each</div>
                    <div><span className="font-medium">🎯 11-15th place:</span> 2.2% each</div>
                  </div>
                </div>
              </div>
            </div>
            <motion.button
              onClick={handleClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1 rounded-lg hover:bg-[var(--app-gray)] transition-colors"
            >
              <span className="text-xl">✖️</span>
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
              {/* Total Players Card */}
              <motion.div 
                className="bg-[var(--app-background)] rounded-lg p-3 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              >
                {loading ? (
                  <>
                    <motion.div 
                      className="h-6 bg-[var(--app-card-border)] rounded mb-1"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="text-xs text-[var(--app-foreground-muted)]">Total Players</div>
                  </>
                ) : (
                  <>
                    <motion.div 
                      className="text-md font-bold text-[var(--app-foreground)]"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
                    >
                      {globalStats.totalPlayers}
                    </motion.div>
                    <div className="text-xs text-[var(--app-foreground-muted)]">Total Players</div>
                  </>
                )}
              </motion.div>

              {/* Total Rewards Card */}
              <motion.div 
                className="bg-[var(--app-background)] rounded-lg p-3 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              >
                {loading ? (
                  <>
                    <motion.div 
                      className="h-6 bg-[var(--app-card-border)] rounded mb-1"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="text-xs text-[var(--app-foreground-muted)]">Total Rewards</div>
                  </>
                ) : (
                  <>
                    <motion.div 
                      className="text-md font-bold text-[var(--app-foreground)]"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
                    >
                      {parseFloat(globalStats.totalRewards).toLocaleString()} {rewardSymbol}
                    </motion.div>
                    <div className="text-xs text-[var(--app-foreground-muted)]">Total Rewards</div>
                  </>
                )}
              </motion.div>

              {/* Your Rank Card */}
              <motion.div 
                className="bg-[var(--app-background)] rounded-lg p-3 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
              >
                {loading ? (
                  <>
                    <motion.div 
                      className="h-6 bg-[var(--app-card-border)] rounded mb-1"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="text-xs text-[var(--app-foreground-muted)]">Your Rank</div>
                  </>
                ) : (
                  <>
                    <motion.div 
                      className="text-md font-bold text-[var(--app-foreground)]"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.4, ease: "easeOut" }}
                    >
                      #{playerRank || '—'}
                    </motion.div>
                    <div className="text-xs text-[var(--app-foreground-muted)]">Your Rank</div>
                  </>
                )}
              </motion.div>

              {/* Your Rewards Card */}
              <motion.div 
                className="bg-[var(--app-background)] rounded-lg p-3 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
              >
                {loading ? (
                  <>
                    <motion.div 
                      className="h-6 bg-[var(--app-card-border)] rounded mb-1"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="text-xs text-[var(--app-foreground-muted)]">Your Rewards</div>
                  </>
                ) : (
                  <>
                    <motion.div 
                      className="text-md font-bold text-[var(--app-foreground)]"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.5, ease: "easeOut" }}
                    >
                      {playerRewards} {rewardSymbol}
                    </motion.div>
                    <div className="text-xs text-[var(--app-foreground-muted)]">Your Rewards</div>
                  </>
                )}
              </motion.div>
            </div>
          </div>

          {/* Leaderboard List */}
          <div className="no-scrollbar flex-1 overflow-y-auto max-h-96">
            {loading ? (
              <div className="p-8 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 mx-auto mb-2"
                >🌎</motion.div>
                <div className="text-[var(--app-foreground-muted)]">Loading leaderboard...</div>
              </div>
            ) : players.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🎮</div>
                <div className="text-[var(--app-foreground-muted)]">No players yet. Be the first!</div>
              </div>
            ) : (
              <div className="no-scrollbar p-4 space-y-2">
                {players.map((player, index) => {
                  const isCurrentUser = player.playerId === address;
                  return (
                  <motion.div
                    key={`${player.playerId}-${index}-${player.score}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center space-x-3 p-3 rounded-lg ${
                      isCurrentUser 
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
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 to-blue-500 border-2 border-blue-600 flex items-center justify-center overflow-hidden">
                        {/* Check if we have a real image URL or just an emoji */}
                        {(isCurrentUser && context?.user?.pfpUrl) || player.farcasterProfile?.pfpUrl ? (
                          <Image
                            src={
                              isCurrentUser && context?.user?.pfpUrl
                                ? context.user.pfpUrl
                                : player.farcasterProfile?.pfpUrl || ''
                            }
                            alt={
                              isCurrentUser && context?.user?.displayName
                                ? context.user.displayName
                                : player.farcasterProfile?.displayName || player.name
                            }
                            width={32}
                            height={32}
                            className="w-auto h-auto rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              (target.nextElementSibling as HTMLElement)!.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {/* Emoji fallback */}
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                          style={{ 
                            display: (isCurrentUser && context?.user?.pfpUrl) || player.farcasterProfile?.pfpUrl ? 'none' : 'flex' 
                          }}
                        >
                          {player.avatar}
                        </div>
                      </div>
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-[var(--app-foreground)] truncate">
                          {/* Show live MiniKit data for current user if connected */}
                          {isCurrentUser && context?.user?.displayName
                            ? context.user.displayName
                            : player.farcasterProfile?.displayName || player.name}
                        </span>
                        {(player.farcasterProfile?.username || (isCurrentUser && context?.user?.username)) && (
                          <span className="text-xs text-purple-400 ml-1">
                            @{isCurrentUser && context?.user?.username
                              ? context.user.username
                              : player.farcasterProfile?.username}
                          </span>
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
