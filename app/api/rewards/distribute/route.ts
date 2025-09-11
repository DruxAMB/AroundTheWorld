import { NextRequest, NextResponse } from 'next/server';
import { gameDataService } from '@/app/services/gameDataService';
import { RewardDistributionService } from '@/lib/reward-distribution';
import { batchDistributeRewards, getWalletBalance, getRewardDistributorWallet } from '@/lib/cdp/cdp-wallet';
import { redis } from '@/lib/redis';

// Security: Only allow requests from authenticated admin or automated triggers
const ADMIN_PIN_KEY = 'admin:pin';
const AUTOMATED_TRIGGER_SECRET = process.env.AUTOMATED_TRIGGER_SECRET;

interface RewardDistribution {
  address: string;
  amount: string;
  rank: number;
  playerName: string;
  score: number;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      timeframe, 
      triggerType, 
      adminPin, 
      automatedSecret 
    } = await request.json();

    // Validate timeframe
    if (!timeframe || !['week', 'month', 'all-time'].includes(timeframe)) {
      return NextResponse.json({ 
        error: 'Invalid timeframe. Must be one of: week, month, all-time' 
      }, { status: 400 });
    }

    // Authentication check
    let isAuthorized = false;
    
    if (triggerType === 'automated' && automatedSecret === AUTOMATED_TRIGGER_SECRET) {
      isAuthorized = true;
      console.log('🤖 Automated reward distribution triggered');
    } else if (triggerType === 'manual' && adminPin) {
      // Verify admin PIN
      if (!redis) {
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
      }
      
      const storedPin = await redis.get(ADMIN_PIN_KEY);
      if (String(adminPin) === String(storedPin)) {
        isAuthorized = true;
        console.log('👨‍💼 Manual reward distribution triggered by admin');
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get leaderboard data
    const leaderboard = await gameDataService.getLeaderboard(timeframe, 15); // Get more players for eligibility check
    
    if (leaderboard.length === 0) {
      return NextResponse.json({ 
        message: 'No players found for reward distribution',
        distributed: []
      });
    }

    // Get global stats for reward pool calculation
    const globalStats = await gameDataService.getGlobalStats();
    const baseRewardAmount = parseFloat(globalStats.rewardAmount || globalStats.totalRewards || '0');
    
    if (baseRewardAmount <= 0) {
      return NextResponse.json({ 
        error: 'No reward pool configured',
        distributed: []
      });
    }

    // Calculate reward distribution
    const totalRewardPool = baseRewardAmount * 1e18; // Convert to wei equivalent
    const rewardDistributions: RewardDistribution[] = [];

    // Track used wallet addresses to prevent duplicates
    const usedWalletAddresses = new Set<string>();
    
    // Process players sequentially to preserve rankings and enable early termination
    for (let i = 0; i < leaderboard.length && rewardDistributions.length < 15; i++) {
      const player = leaderboard[i];
      const actualRank = i + 1; // Preserve original leaderboard rank
      
      // Skip players with no score
      if (!player.score || player.score <= 0) continue;
      
      // Validate playerId exists
      if (!player.playerId) {
        console.warn(`Player at rank ${actualRank} has no playerId, skipping`);
        continue;
      }
      
      try {
        // Get full player profile from database with error handling
        const profile = await gameDataService.getPlayer(player.playerId);
        if (!profile) {
          console.warn(`Player profile not found for playerId: ${player.playerId} at rank ${actualRank}`);
          continue;
        }
        
        // Validate wallet address
        if (!profile.walletAddress || !profile.walletAddress.startsWith('0x')) {
          console.log(`Player ${player.name} at rank ${actualRank} has no valid wallet address`);
          continue;
        }
        
        // Check for duplicate wallet addresses
        if (usedWalletAddresses.has(profile.walletAddress)) {
          console.warn(`Duplicate wallet address ${profile.walletAddress} for player ${player.name} at rank ${actualRank}, skipping`);
          continue;
        }
        
        // Calculate reward amount for this rank
        const rewardAmount = RewardDistributionService.getRewardForRank(actualRank, totalRewardPool);
        const rewardAmountEth = RewardDistributionService.formatRewardAmount(rewardAmount);
        
        // Only distribute if reward amount is meaningful (> 0.00001 ETH)
        if (parseFloat(rewardAmountEth) >= 0.00001) {
          rewardDistributions.push({
            address: profile.walletAddress,
            amount: rewardAmountEth,
            rank: actualRank,
            playerName: player.name,
            score: player.score
          });
          
          // Track this wallet address as used
          usedWalletAddresses.add(profile.walletAddress);
          
          console.log(`✅ Added player ${player.name} (rank ${actualRank}) for ${rewardAmountEth} ETH reward`);
        } else {
          console.log(`⚠️ Reward amount ${rewardAmountEth} ETH too small for player ${player.name} at rank ${actualRank}`);
        }
        
      } catch (error) {
        console.error(`Failed to process player ${player.playerId} at rank ${actualRank}:`, error);
        // Continue processing other players instead of failing completely
        continue;
      }
    }
    
    console.log(`🎯 Processed ${leaderboard.length} leaderboard players, found ${rewardDistributions.length} eligible for rewards`);

    if (rewardDistributions.length === 0) {
      return NextResponse.json({ 
        message: 'No eligible players for reward distribution',
        distributed: []
      });
    }

    // Check wallet balance before distribution
    const walletBalance = await getWalletBalance();
    const totalDistributionAmount = rewardDistributions.reduce(
      (sum, dist) => sum + parseFloat(dist.amount), 0
    );

    if (parseFloat(walletBalance.eth) < totalDistributionAmount) {
      return NextResponse.json({ 
        error: `Insufficient wallet balance. Need ${totalDistributionAmount} ETH, have ${walletBalance.eth} ETH`,
        distributed: []
      }, { status: 400 });
    }

    console.log(`💰 Distributing ${totalDistributionAmount} ETH to ${rewardDistributions.length} players`);

    // Execute batch reward distribution
    const distributionResults = await batchDistributeRewards(
      rewardDistributions.map(dist => ({
        address: dist.address,
        amount: dist.amount,
        memo: `AroundTheWorld ${timeframe} reward - Rank #${dist.rank}`
      }))
    );

    // Log successful distributions
    const successfulDistributions = distributionResults.filter(result => result.success);
    const failedDistributions = distributionResults.filter(result => !result.success);

    // Store distribution record in Redis for history
    if (redis && successfulDistributions.length > 0) {
      const distributionRecord = {
        timestamp: new Date().toISOString(),
        timeframe,
        triggerType,
        totalAmount: totalDistributionAmount,
        recipientCount: successfulDistributions.length,
        distributions: successfulDistributions
      };
      
      const recordKey = `reward_distribution:${timeframe}:${Date.now()}`;
      await redis.set(recordKey, JSON.stringify(distributionRecord), { ex: 60 * 60 * 24 * 30 }); // 30 days
    }

    // Send notifications for successful distributions
    if (successfulDistributions.length > 0) {
      // Trigger broadcast notification about reward distribution
      try {
        await fetch(`${process.env.NEXT_PUBLIC_URL}/api/broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reward_distribution',
            timeframe,
            amount: totalDistributionAmount,
            symbol: 'ETH',
            recipientCount: successfulDistributions.length
          })
        });
      } catch (notificationError) {
        console.error('Failed to send reward distribution notification:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Distributed rewards to ${successfulDistributions.length} players`,
      timeframe,
      totalAmount: totalDistributionAmount,
      distributed: successfulDistributions,
      failed: failedDistributions,
      walletBalance: walletBalance.eth
    });

  } catch (error) {
    console.error('Error in reward distribution:', error);
    return NextResponse.json({ 
      error: 'Failed to distribute rewards',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check distribution status and history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get('timeframe') as 'week' | 'month' | 'all-time') || 'week';
    
    if (!redis) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Get recent distribution history
    const keys = await redis.keys(`reward_distribution:${timeframe}:*`);
    const recentDistributions = [];
    
    for (const key of keys.slice(-5)) { // Last 5 distributions
      try {
        const record = await redis.get(key);
        if (record) {
          // Handle both string and object responses from Redis
          if (typeof record === 'string') {
            recentDistributions.push(JSON.parse(record));
          } else if (typeof record === 'object' && record !== null) {
            recentDistributions.push(record);
          }
        }
      } catch (parseError) {
        console.error('Failed to parse distribution record:', parseError);
      }
    }

    // Get current wallet balance and server wallet address
    const walletBalance = await getWalletBalance();
    const serverWallet = await getRewardDistributorWallet();
    
    // Get current leaderboard for preview
    const leaderboard = await gameDataService.getLeaderboard(timeframe, 15);
    const globalStats = await gameDataService.getGlobalStats();
    
    return NextResponse.json({
      walletBalance: walletBalance.eth,
      serverWalletAddress: serverWallet.address,
      recentDistributions: recentDistributions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
      currentLeaderboard: leaderboard,
      rewardPool: globalStats.rewardAmount || globalStats.totalRewards || '0',
      timeframe
    });

  } catch (error) {
    console.error('Error fetching distribution status:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch distribution status' 
    }, { status: 500 });
  }
}
