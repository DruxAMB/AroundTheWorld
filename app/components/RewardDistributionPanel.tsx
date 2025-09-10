'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface DistributionHistory {
  timestamp: string;
  timeframe: string;
  totalAmount: number;
  recipientCount: number;
  triggerType: string;
}

interface RewardDistributionPanelProps {
  onDistribute?: (result: any) => void;
}

export default function RewardDistributionPanel({ onDistribute }: RewardDistributionPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState('0');
  const [distributionHistory, setDistributionHistory] = useState<DistributionHistory[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all-time'>('week');
  const [currentLeaderboard, setCurrentLeaderboard] = useState<any[]>([]);
  const [rewardPool, setRewardPool] = useState('0');

  useEffect(() => {
    loadDistributionStatus();
  }, [selectedTimeframe]);

  const loadDistributionStatus = async () => {
    try {
      const response = await fetch(`/api/rewards/distribute?timeframe=${selectedTimeframe}`);
      if (response.ok) {
        const data = await response.json();
        setWalletBalance(data.walletBalance || '0');
        setDistributionHistory(data.recentDistributions || []);
        setCurrentLeaderboard(data.currentLeaderboard || []);
        setRewardPool(data.rewardPool || '0');
      }
    } catch (error) {
      console.error('Failed to load distribution status:', error);
    }
  };

  const handleManualDistribution = async () => {
    const adminPin = prompt('Enter admin PIN to confirm reward distribution:');
    if (!adminPin) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/rewards/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframe: selectedTimeframe,
          triggerType: 'manual',
          adminPin
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        alert(`✅ ${result.message}\nTotal distributed: ${result.totalAmount} ETH`);
        loadDistributionStatus();
        onDistribute?.(result);
      } else {
        alert(`❌ Distribution failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Distribution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatEth = (amount: number | string) => {
    return parseFloat(amount.toString()).toFixed(6);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">🎁 Reward Distribution Center</h3>
      
      {/* Wallet Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800">Wallet Balance</h4>
          <p className="text-2xl font-bold text-blue-900">{formatEth(walletBalance)} ETH</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800">Reward Pool</h4>
          <p className="text-2xl font-bold text-green-900">{formatEth(rewardPool)} ETH</p>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-800">Eligible Players</h4>
          <p className="text-2xl font-bold text-purple-900">{currentLeaderboard.length}</p>
        </div>
      </div>

      {/* Distribution Controls */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeframe
            </label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as 'week' | 'month' | 'all-time')}
              className="px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="all-time">All-Time</option>
            </select>
          </div>
          
          <div className="flex-1"></div>
          
          <button
            onClick={handleManualDistribution}
            disabled={isLoading || parseFloat(walletBalance) === 0 || currentLeaderboard.length === 0}
            className={`px-6 py-2 rounded-md font-medium text-white ${
              isLoading || parseFloat(walletBalance) === 0 || currentLeaderboard.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block mr-2"
                >
                  🔄
                </motion.span>
                Distributing...
              </span>
            ) : (
              'Distribute Rewards'
            )}
          </button>
        </div>
      </div>

      {/* Current Leaderboard Preview */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Current {selectedTimeframe} Leaderboard (Top 5)</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          {currentLeaderboard.slice(0, 5).map((player, index) => (
            <div key={player.playerId} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
              <div className="flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">{player.name}</p>
                  <p className="text-sm text-gray-500">{player.playerId.slice(0, 8)}...</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{player.score.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Level {player.bestLevel}</p>
              </div>
            </div>
          ))}
          {currentLeaderboard.length === 0 && (
            <p className="text-gray-500 text-center py-4">No eligible players found</p>
          )}
        </div>
      </div>

      {/* Distribution History */}
      <div>
        <h4 className="font-medium mb-3">Recent Distributions</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {distributionHistory.map((distribution, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{distribution.timeframe} Distribution</p>
                  <p className="text-sm text-gray-500">{formatDate(distribution.timestamp)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatEth(distribution.totalAmount)} ETH</p>
                  <p className="text-sm text-gray-500">{distribution.recipientCount} recipients</p>
                </div>
              </div>
              <div className="mt-2">
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  distribution.triggerType === 'automated' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {distribution.triggerType}
                </span>
              </div>
            </div>
          ))}
          {distributionHistory.length === 0 && (
            <p className="text-gray-500 text-center py-4">No recent distributions</p>
          )}
        </div>
      </div>
    </div>
  );
}
