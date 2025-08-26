'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

type TimeFrame = 'week' | 'month' | 'all-time';

export default function LeaderboardReset() {
  const [isResetting, setIsResetting] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>('week');
  const [resetStatus, setResetStatus] = useState<{
    success?: boolean;
    message?: string;
    timestamp?: string;
  } | null>(null);

  const handleReset = async () => {
    if (isResetting) return;
    
    try {
      setIsResetting(true);
      setResetStatus(null);
      
      const response = await fetch('/api/admin/reset-leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe: selectedTimeframe }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset leaderboard');
      }
      
      setResetStatus({
        success: true,
        message: `Successfully reset ${selectedTimeframe} leaderboard`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error resetting leaderboard:', error);
      setResetStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset leaderboard',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Reset Leaderboard</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Timeframe
        </label>
        <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value as TimeFrame)}
          className="w-full text-black border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isResetting}
        >
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
          <option value="all-time">All Time</option>
        </select>
      </div>
      
      <div className="flex items-center space-x-4">
        <button
          onClick={handleReset}
          disabled={isResetting}
          className={`
            px-4 py-2 rounded-md flex items-center space-x-2
            ${isResetting
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-colors'
            }
          `}
        >
          {isResetting ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                🔄
              </motion.span>
              <span>Resetting...</span>
            </>
          ) : (
            <>
              <span>🔄</span>
              <span>Reset {selectedTimeframe === 'all-time' ? 'All Time' : selectedTimeframe} Leaderboard</span>
            </>
          )}
        </button>
      </div>
      
      {resetStatus && (
        <div className={`mt-4 p-3 rounded-md ${resetStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className={`text-sm font-medium ${resetStatus.success ? 'text-green-800' : 'text-red-800'}`}>
            {resetStatus.success ? '✅ ' : '❌ '} 
            {resetStatus.message}
          </div>
          {resetStatus.timestamp && (
            <div className="text-xs mt-1 text-gray-500">
              {new Date(resetStatus.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p className="font-medium">⚠️ Warning</p>
        <p>Resetting a leaderboard will clear all scores for the selected timeframe. This action cannot be undone.</p>
      </div>
    </div>
  );
}
