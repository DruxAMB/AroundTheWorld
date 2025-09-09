import { NextRequest, NextResponse } from 'next/server';
import { gameDataService } from '@/app/services/gameDataService';
import { RewardDistributionService } from '@/lib/reward-distribution';
import { distributeReward, batchDistributeRewards, getWalletBalance } from '@/lib/cdp-wallet';
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
    const leaderboard = await gameDataService.getLeaderboard(timeframe, 10); // Top 10 players
    
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

    // Only distribute to players with wallet addresses and scores > 0
    const eligiblePlayers = leaderboard.filter(player => 
      player.playerId && 
      player.score > 0 && 
      player.playerId.startsWith('0x') // Valid Ethereum address
    );

    for (let i = 0; i < Math.min(eligiblePlayers.length, 10); i++) {
      const player = eligiblePlayers[i];
      const rank = i + 1;
      
      // Calculate reward amount for this rank
      const rewardAmount = RewardDistributionService.getRewardForRank(rank, totalRewardPool);
      const rewardAmountEth = RewardDistributionService.formatRewardAmount(rewardAmount);
      
      // Only distribute if reward amount is meaningful (> 0.0001 ETH)
      if (parseFloat(rewardAmountEth) >= 0.0001) {
        rewardDistributions.push({
          address: player.playerId,
          amount: rewardAmountEth,
          rank,
          playerName: player.name,
          score: player.score
        });
      }
    }

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
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/broadcast`, {
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
          recentDistributions.push(JSON.parse(record as string));
        }
      } catch (parseError) {
        console.error('Failed to parse distribution record:', parseError);
      }
    }

    // Get current wallet balance
    const walletBalance = await getWalletBalance();
    
    // Get current leaderboard for preview
    const leaderboard = await gameDataService.getLeaderboard(timeframe, 10);
    const globalStats = await gameDataService.getGlobalStats();
    
    return NextResponse.json({
      walletBalance: walletBalance.eth,
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
