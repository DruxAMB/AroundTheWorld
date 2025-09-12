'use client';

import React, { useState, useEffect } from 'react';
import { parseEther } from 'viem';
import { createBaseAccountSDK } from '@base-org/account';
import { getRewardDistributorAddressesClient } from '@/lib/utils/wallet-storage';
import { motion } from 'framer-motion';
import { SignInWithBaseButton } from './SignInWithBase';
import { RewardChatInterface } from './RewardChatInterface';
import Image from 'next/image';

interface DistributionHistory {
  timestamp: string;
  timeframe: string;
  totalAmount: number;
  recipientCount: number;
  triggerType: string;
}

interface RewardDistributionPanelProps {
  onDistribute?: (result: any) => void;
  onAdminConnect?: (address: string) => void;
}

export default function RewardDistributionPanel({ onDistribute, onAdminConnect }: RewardDistributionPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [adminWalletBalance, setAdminWalletBalance] = useState('0');
  const [distributionHistory, setDistributionHistory] = useState<DistributionHistory[]>([]);
  const [selectedTimeframe, ] = useState<'week'>('week');
  const [currentLeaderboard, setCurrentLeaderboard] = useState<any[]>([]);
  const [rewardPool, setRewardPool] = useState('0.1');
  const [isWalletAuthenticated, setIsWalletAuthenticated] = useState(false);
  const [adminAddress, setAdminAddress] = useState<string>('');
  const [spendPermissionStatus, setSpendPermissionStatus] = useState<'none' | 'valid' | 'invalid' | 'expired'>('none');

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

    // Simple localStorage check like ChatInterface demo
    const storedPermission = localStorage.getItem('spendPermission');
    if (!storedPermission) {
      setSpendPermissionStatus('none');
      return;
    }

    try {
      const permission = JSON.parse(storedPermission);
      if (permission && permission.permissionHash) {
        setSpendPermissionStatus('valid');
      } else {
        setSpendPermissionStatus('invalid');
      }
    } catch (error) {
      setSpendPermissionStatus('invalid');
    }
  };

  const handleSignIn = async (address: string) => {
    console.log('Admin authenticated with address:', address);
    setIsWalletAuthenticated(true);
    setAdminAddress(address);
    
    // Notify parent component about admin connection
    if (onAdminConnect) {
      onAdminConnect(address);
    }
    
    try {
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
      // Fetch weekly leaderboard data with correct timeframe parameter
      const params = new URLSearchParams({
        timeframe: 'week',
        limit: '15'
      });
      
      const leaderboardResponse = await fetch(`/api/leaderboard?${params}`);
      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        setCurrentLeaderboard(leaderboardData.leaderboard || []);
      }
      setDistributionHistory([]);
      setRewardPool('0.005'); // Default reward pool
    } catch (error) {
      console.error('Failed to load distribution status:', error);
    }
  };

  // Check if distribution should be enabled
  const isDistributionEnabled = () => {
    if (!isWalletAuthenticated || !adminAddress) return false;
    if (!rewardPool || parseFloat(rewardPool) <= 0) return false;
    
    // Check if spend permission is valid (using the async status we already checked)
    if (spendPermissionStatus !== 'valid') return false;
    
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
      // Get stored spend permission like ChatInterface demo
      const storedPermission = localStorage.getItem('spendPermission');
      if (!storedPermission) {
        alert('No spend permission found. Please grant spend permission first.');
        setIsLoading(false);
        return;
      }

      const spendPermission = JSON.parse(storedPermission);

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
      
      // Step 1: Execute spend permission client-side to transfer funds to server wallet
      console.log('Executing spend permission to transfer funds to server wallet...');
      
      const sdk = createBaseAccountSDK({
        appName: 'AroundTheWorld Game',
        appChainIds: [84532], // Base Sepolia
      });

      // Get server wallet address
      const serverAddresses = await getRewardDistributorAddressesClient();
      if (!serverAddresses?.address) {
        throw new Error('Server wallet address not found');
      }

      // Prepare spend call data for total reward pool
      const totalAmountWei = parseEther(rewardPool.toString());
      
      // Debug: Log the complete stored spend permission structure
      console.log('Complete stored spendPermission:', JSON.stringify(spendPermission, null, 2));
      
      // The utilities expect the complete SpendPermission object with signature and chainId
      // Ensure chainId is present at the top level if missing
      if (!spendPermission.chainId) {
        spendPermission.chainId = 84532; // Base Sepolia
      }
      
      console.log('Using complete spend permission with chainId:', spendPermission.chainId);
      
      // Import spend permission utilities dynamically (client-side only)
      const { getPermissionStatus, prepareSpendCallData } = await import('@base-org/account/spend-permission');
      
      // Check permission status
      const status = await getPermissionStatus(spendPermission);
      console.log('Permission status:', status);
      console.log('Current time:', new Date());
      console.log('Permission period start (Unix):', spendPermission.permission?.start);
      console.log('Permission period start (Date):', new Date(spendPermission.permission?.start * 1000));
      console.log('Permission period end (Unix):', spendPermission.permission?.end);
      console.log('Permission period end (Date):', new Date(spendPermission.permission?.end * 1000));
      
      // Manual time check - if current time is past the permission start, it should be active
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const permissionStart = spendPermission.permission?.start;
      const permissionEnd = spendPermission.permission?.end;
      
      console.log('Current timestamp:', currentTimestamp);
      console.log('Permission start timestamp:', permissionStart);
      console.log('Time comparison - Current >= Start:', currentTimestamp >= permissionStart);
      console.log('Time comparison - Current <= End:', currentTimestamp <= permissionEnd);
      
      if (!status.isActive) {
        // Check if we should override the isActive check based on manual time comparison
        const shouldBeActive = currentTimestamp >= permissionStart && currentTimestamp <= permissionEnd;
        console.log('Manual calculation says permission should be active:', shouldBeActive);
        
        if (!shouldBeActive) {
          throw new Error(`Spend permission is not active. Next period starts: ${status.nextPeriodStart}`);
        } else {
          console.log('WARNING: getPermissionStatus says inactive but manual check says active. Proceeding...');
        }
      }
      
      if (status.remainingSpend < totalAmountWei) {
        throw new Error(`Insufficient spend permission. Remaining: ${Number(status.remainingSpend) / 1e18} ETH`);
      }
      
      const spendCalls = await prepareSpendCallData(spendPermission, totalAmountWei);
      console.log('Prepared spend calls:', spendCalls);

      // Send spend calls to backend for execution via CDP with paymaster (Base demo pattern)
      console.log('Sending spend calls to server for execution with gas sponsorship...');
      const spendResponse = await fetch('/api/admin/execute-spend-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spendCalls,
          adminPin,
          rewardPool: parseFloat(rewardPool),
          userAddress: adminAddress // Admin address for server wallet lookup
        })
      });

      if (!spendResponse.ok) {
        throw new Error('Failed to execute spend permission');
      }

      const spendResult = await spendResponse.json();
      console.log('Spend calls executed by server with gas sponsorship:', spendResult);
      
      // Step 2: Execute the distribution from server wallet to players
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
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold text-gray-900">Wallet Status</h4>
        <button
          onClick={() => {
            fetchAdminWalletBalance(adminAddress);
            checkSpendPermissionStatus();
            loadDistributionStatus();
          }}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
      </div>

      {/* Distribution Controls */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeframe
            </label>
            <div className="px-3 py-2 text-black border border-gray-300 rounded-md bg-gray-50">
              Current Week
            </div>
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
                  🌎
                </motion.span>
                Distributing...
              </span>
            ) : (
              'Distribute Rewards'
            )}
          </button>
        </div>
      </div>

        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Chat Interface - Left Side (2/3 width) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 chat-container overflow-hidden h-[600px]">
                <RewardChatInterface isAuthenticated={true} userAddress={adminAddress} />
              </div>
            </div>
            
            {/* Reward Management Panel - Right Side (1/3 width) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden h-[600px] p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Reward Management</h3>
                
                {/* Current Leaderboard Preview */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-black">Current Week Leaderboard (Top 15)</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {currentLeaderboard
                      .filter(player => player.farcasterProfile?.pfpUrl && player.farcasterProfile?.displayName)
                      .slice(0, 15)
                      .map((player, index) => (
                      <div key={`${player.playerId}-${index}`} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0 text-black">
                        <div className="flex items-center">
                          <span className="w-6 h-6 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-2">
                            {index + 1}
                          </span>
                          
                          {/* Avatar */}
                          <div className="flex-shrink-0 mr-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 to-blue-500 border-2 border-blue-600 flex items-center justify-center overflow-hidden">
                              {player.farcasterProfile?.pfpUrl ? (
                                <Image
                                  src={player.farcasterProfile.pfpUrl}
                                  alt={player.farcasterProfile.displayName || player.name}
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
                                  display: player.farcasterProfile?.pfpUrl ? 'none' : 'flex' 
                                }}
                              >
                                {player.avatar}
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-sm text-black">
                                {player.farcasterProfile?.displayName || player.name}
                              </p>
                              {player.farcasterProfile?.username && (
                                <span className="text-xs text-purple-400">
                                  @{player.farcasterProfile.username}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{player.playerId.slice(0, 8)}...</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm text-black">{player.score.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Level {player.levelsCompleted}</p>
                        </div>
                      </div>
                    ))}
                    {currentLeaderboard.length === 0 && (
                      <p className="text-gray-500 text-center py-4 text-sm">No eligible players found</p>
                    )}
                  </div>
                </div>

                {/* Distribution History */}
                <div>
                  <h4 className="font-medium mb-3">Recent Distributions</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {distributionHistory.map((distribution, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm capitalize">{distribution.timeframe} Distribution</p>
                            <p className="text-xs text-gray-500">{formatDate(distribution.timestamp)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">{formatEth(distribution.totalAmount)} USDC</p>
                            <p className="text-xs text-gray-500">{distribution.recipientCount} recipients</p>
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
                      <p className="text-gray-500 text-center py-4 text-sm">No recent distributions</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
  );
}
