"use client";

import { motion } from "framer-motion";
import { useGameData } from "../hooks/useGameData";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import Image from "next/image";

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { player, progress, loading, refreshPlayerData } = useGameData();
  const { context } = useMiniKit();
  
  // Get Farcaster profile data
  const pfpUrl = context?.user?.pfpUrl;
  const userFid = context?.user?.fid;

  if (!isOpen) return null;



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-lg m-auto flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="rounded-2xl p-6 w-full max-w-md h-screen overflow-y-auto no-scrollbar scroll-smooth"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-700 to-blue-500 border-2 border-blue-600 flex items-center justify-center">
              {pfpUrl ? (
                <Image
                  src={pfpUrl} 
                  alt={player?.name || 'Profile'} 
                  className="w-full h-full object-cover"
                  width={100}
                  height={100}
                />
              ) : (
                <span className="text-2xl">{player?.avatar || '🎮'}</span>
              )}
            </div>
            <div>
              <h2 className="text-md font-bold text-white">
                {context?.user?.displayName || context?.user?.username || player?.name || 'User Profile'}
              </h2>
              <p className="text-gray-400 text-xs">
                {userFid ? `FID: ${userFid}` : 'Player Statistics'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshPlayerData}
              disabled={loading}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh profile data"
            >
              {loading ? (
                <div className="animate-spin text-lg">🌎</div>
              ) : (
                <span className="text-lg">🔄</span>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-lg transition-colors"
              title="Close profile"
            >
              ✖️
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin text-2xl mb-2">🌎</div>
            <p className="text-gray-400">Loading profile...</p>
          </div>
        ) : player ? (
          <div className="space-y-4">
            {/* Player Name */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-1">Player Name</h3>
              <p className="text-white font-semibold">{player.name}</p>
            </div>

            {/* Game Statistics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 rounded-lg p-4 border border-blue-700/30">
                <h3 className="text-sm font-medium text-blue-300 mb-1">Total Score</h3>
                <p className="text-2xl font-bold text-white">{player.totalScore.toLocaleString()}</p>
                <p className="text-xs text-blue-300">Resets weekly</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 rounded-lg p-4 border border-green-700/30">
                <h3 className="text-sm font-medium text-green-300 mb-1">Levels Completed</h3>
                <p className="text-2xl font-bold text-white">{player.levelsCompleted}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 rounded-lg p-4 border border-purple-700/30">
                <h3 className="text-sm font-medium text-purple-300 mb-1">Best Level</h3>
                <p className="text-2xl font-bold text-white">{player.bestLevel}</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/30 rounded-lg p-4 border border-orange-700/30">
                <h3 className="text-sm font-medium text-orange-300 mb-1">Progress</h3>
                <p className="text-2xl font-bold text-white">{progress.length}</p>
                <p className="text-xs text-orange-300">Saved Levels</p>
              </div>
            </div>

            {/* Wallet Information */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Wallet Address</h3>
              <div className="flex items-center gap-2">
                <code className="text-sm text-blue-400 bg-gray-900/50 px-2 py-1 rounded">
                  {formatAddress(player.walletAddress)}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(player.walletAddress)}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                  title="Copy full address"
                >
                  📋
                </button>
              </div>
            </div>

            {/* Account Information */}
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-1">Account Created</h3>
                <p className="text-white text-sm">{formatDate(player.createdAt)}</p>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-1">Last Active</h3>
                <p className="text-white text-sm">{formatDate(player.lastActive)}</p>
              </div>
            </div>

            {/* Player ID */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Player ID</h3>
              <code className="text-xs text-gray-400 bg-gray-900/50 px-2 py-1 rounded block break-all">
                {player.id}
              </code>
            </div>

            {/* Recent Progress */}
            {progress.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Progress</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {progress.slice(-3).reverse().map((level) => (
                    <div key={level.levelId} className="flex items-center justify-between text-sm">
                      <span className="text-white">Level {level.levelId}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400">{level.score} pts</span>
                        <span className="text-gray-400">
                          {'⭐'.repeat(level.stars)}
                        </span>
                        {level.completed && <span className="text-green-400">✓</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎮</div>
            <p className="text-gray-400">No player data available</p>
            <p className="text-gray-500 text-sm">Connect your wallet to view profile</p>
          </div>
        )}

        {/* Close Button */}
        {/* <div className="mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
          >
            Close Profile
          </button>
        </div> */}
      </motion.div>
    </motion.div>
  );
}
