'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SignInWithBaseButton } from '@/app/components/SignInWithBase';
import { getRewardDistributorAddressesClient } from '@/lib/utils/wallet-storage';

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
  const [adminWalletBalance, setAdminWalletBalance] = useState('0');
  const [distributionHistory, setDistributionHistory] = useState<DistributionHistory[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all-time'>('week');
  const [currentLeaderboard, setCurrentLeaderboard] = useState<any[]>([]);
  const [rewardPool, setRewardPool] = useState('0.1');
  const [isWalletAuthenticated, setIsWalletAuthenticated] = useState(false);
  const [adminAddress, setAdminAddress] = useState<string>('');
  const [spendPermissionStatus, setSpendPermissionStatus] = useState<'none' | 'valid' | 'invalid' | 'expired'>('none');
  const [serverWallet, setServerWallet] = useState<any>(null);

  useEffect(() => {
    checkWalletAuthStatus();
    checkSpendPermissionStatus();
    if (isWalletAuthenticated) {
      loadDistributionStatus();
    }
  }, [selectedTimeframe, isWalletAuthenticated, adminAddress]);

  const checkWalletAuthStatus = async () => {
    // No need to check wallet creation API - we use fixed addresses
    // Admin just needs to connect their wallet for spend permissions
    console.log('Wallet auth check skipped - using fixed reward distributor addresses');
  };

  const checkSpendPermissionStatus = () => {
    if (!adminAddress) {
      setSpendPermissionStatus('none');
      return;
    }

    const storedPermission = localStorage.getItem('adminSpendPermission');
    if (!storedPermission) {
      setSpendPermissionStatus('none');
      return;
    }

    try {
      const permission = JSON.parse(storedPermission);
      
      // Validate permission structure
      if (!permission.account || !permission.spender || !permission.allowance) {
        setSpendPermissionStatus('invalid');
        return;
      }
      
      // Verify permission account matches current admin address
      if (permission.account.toLowerCase() !== adminAddress.toLowerCase()) {
        setSpendPermissionStatus('invalid');
        return;
      }
      
      // Check if permission has expired (if it has an end date)
      if (permission.end && Date.now() / 1000 > permission.end) {
        setSpendPermissionStatus('expired');
        return;
      }
      
      setSpendPermissionStatus('valid');
    } catch (error) {
      console.error('Error checking spend permission status:', error);
      setSpendPermissionStatus('invalid');
    }
  };

  const handleSignIn = async (address: string) => {
    console.log('Admin authenticated with address:', address);
    setIsWalletAuthenticated(true);
    setAdminAddress(address);
    
    // Load reward distributor addresses from storage
    try {
      const addresses = await getRewardDistributorAddressesClient();
      setServerWallet(addresses);
      console.log('Loaded reward distributor addresses from storage:', addresses);
      
      // Fetch admin wallet balance
      await fetchAdminWalletBalance(address);
    } catch (error) {
      console.error('Failed to load wallet addresses:', error);
    }
  };

  const fetchAdminWalletBalance = async (adminAddr: string) => {
    try {
      const response = await fetch(`/api/wallet/balance?address=${adminAddr}`);
      if (response.ok) {
        const data = await response.json();
        setAdminWalletBalance(data.balance || '0');
      }
    } catch (error) {
      console.error('Failed to fetch admin wallet balance:', error);
    }
  };

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

  // Check if distribution should be enabled
  const isDistributionEnabled = () => {
    if (!isWalletAuthenticated || !adminAddress) return false;
    if (!rewardPool || parseFloat(rewardPool) <= 0) return false;
    
    // Check if spend permission exists and is valid
    const storedPermission = localStorage.getItem('adminSpendPermission');
    if (!storedPermission) return false;
    
    try {
      const permission = JSON.parse(storedPermission);
      // Validate permission structure
      if (!permission.account || !permission.spender || !permission.allowance) return false;
      // Verify permission account matches current admin address
      if (permission.account.toLowerCase() !== adminAddress.toLowerCase()) return false;
    } catch (error) {
      console.error('Invalid spend permission format:', error);
      return false;
    }
    
    // Check if admin wallet has sufficient balance
    if (!adminWalletBalance || parseFloat(adminWalletBalance) < parseFloat(rewardPool)) return false;
    
    return true;
  };

  const handleManualDistribution = async () => {
    if (!isDistributionEnabled()) {
      alert('Distribution is not enabled. Please ensure you have connected your wallet, granted spend permission, and have sufficient balance.');
      return;
    }

    const rawPin = prompt('Enter admin PIN to confirm reward distribution:');
    if (!rawPin) return;
    
    // Clean the PIN input (remove non-digits, trim whitespace)
    const adminPin = rawPin.replace(/[^0-9]/g, '').trim();

    setIsLoading(true);
    try {
      // First get the spend permission from localStorage or request it
      const storedPermission = localStorage.getItem('adminSpendPermission');
      let spendPermission = null;
      
      if (storedPermission) {
        spendPermission = JSON.parse(storedPermission);
      } else {
        alert('No spend permission found. Please grant spend permission first.');
        setIsLoading(false);
        return;
      }

      // Calculate AI-powered distribution
      const calculateResponse = await fetch('/api/admin/calculate-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          weeklyRewardPool: parseFloat(rewardPool) || 0.1
        })
      });

      if (!calculateResponse.ok) {
        throw new Error('Failed to calculate reward distribution');
      }

      const calculationResult = await calculateResponse.json();
      
      // Execute the distribution using spend permissions
      const response = await fetch('/api/admin/distribute-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distribution: calculationResult.rewards,
          totalAmount: rewardPool,
          adminAddress,
          spendPermission,
          adminPin
        })
      });

      const result = await response.json();
      
      console.log('Distribution API Response:', {
        status: response.status,
        ok: response.ok,
        result: result
      });
      
      if (response.ok && result.success) {
        alert(`✅ ${result.message}\nTotal distributed: ${result.totalAmount} ETH`);
        loadDistributionStatus();
        onDistribute?.(result);
      } else {
        const errorMessage = result.error || result.message || `HTTP ${response.status}: ${response.statusText}`;
        alert(`❌ Distribution failed: ${errorMessage}`);
        console.error('Distribution failed with result:', result);
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

  // Show wallet authentication if not connected
  if (!isWalletAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🎁 Reward Distribution Center</h3>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-6 text-center">
            Connect your admin wallet to manage reward distributions and spend permissions
          </p>
          <div className='w-fit mx-auto'>
          <SignInWithBaseButton onSignIn={handleSignIn} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">🎁 Reward Distribution Center</h3>
        <div className="text-sm text-gray-600">
          Admin: {adminAddress?.slice(0, 6)}...{adminAddress?.slice(-4)}
        </div>
      </div>
      
      {/* Wallet Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Server Balance</h4>
          <p className="text-2xl font-bold text-blue-800">{formatEth(walletBalance)} ETH</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 mb-2">Admin Balance</h4>
          <p className="text-2xl font-bold text-purple-800">{formatEth(adminWalletBalance)} ETH</p>
        </div>
        <div className={`border rounded-lg p-4 ${
          spendPermissionStatus === 'valid' ? 'bg-green-50 border-green-200' :
          spendPermissionStatus === 'invalid' ? 'bg-red-50 border-red-200' :
          spendPermissionStatus === 'expired' ? 'bg-yellow-50 border-yellow-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <h4 className={`font-medium mb-2 ${
            spendPermissionStatus === 'valid' ? 'text-green-900' :
            spendPermissionStatus === 'invalid' ? 'text-red-900' :
            spendPermissionStatus === 'expired' ? 'text-yellow-900' :
            'text-gray-900'
          }`}>Spend Permission</h4>
          <p className={`text-sm font-medium ${
            spendPermissionStatus === 'valid' ? 'text-green-800' :
            spendPermissionStatus === 'invalid' ? 'text-red-800' :
            spendPermissionStatus === 'expired' ? 'text-yellow-800' :
            'text-gray-800'
          }`}>
            {spendPermissionStatus === 'valid' ? '✅ Active' :
             spendPermissionStatus === 'invalid' ? '❌ Invalid' :
             spendPermissionStatus === 'expired' ? '⏰ Expired' :
             '⚠️ Not Set'}
          </p>
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
            disabled={isLoading || !isWalletAuthenticated || parseFloat(adminWalletBalance) < parseFloat(rewardPool) || currentLeaderboard.length === 0}
            className={`px-6 py-2 rounded-md font-medium text-white ${
              isLoading || !isWalletAuthenticated || parseFloat(adminWalletBalance) < parseFloat(rewardPool) || currentLeaderboard.length === 0
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
