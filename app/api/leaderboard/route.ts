import { NextRequest, NextResponse } from 'next/server';
import { gameDataService } from '../../services/gameDataService';
import { farcasterService } from '../../services/farcasterService';
import { RewardDistributionService } from '@/lib/reward-distribution';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as 'week' | 'month' | 'all-time' || 'all-time';
    const limit = parseInt(searchParams.get('limit') || '50');
    const walletAddress = searchParams.get('address');

    // Get leaderboard data
    const leaderboard = await gameDataService.getLeaderboard(timeframe, limit);
    
    // Get Farcaster profiles for players with FIDs
    const fidsToFetch = leaderboard
      .filter(player => player.fid)
      .map(player => player.fid!);
    
    const farcasterProfiles = fidsToFetch.length > 0 
      ? await farcasterService.getUsersByFids(fidsToFetch)
      : {};
    
    // Enhance leaderboard with Farcaster data
    const enhancedLeaderboard = leaderboard.map(player => ({
      ...player,
      farcasterProfile: player.fid ? farcasterProfiles[player.fid] : null
    }));
    
    // Get global stats which now includes all reward data
    const globalStats = await gameDataService.getGlobalStats();
    
    // Calculate reward pool using reward amount from globalStats
    // Use rewardAmount or totalRewards (for backward compatibility)
    const baseRewardAmount = parseFloat(globalStats.rewardAmount || globalStats.totalRewards);
    
    // For very large numbers, use BigInt to avoid precision loss
    const totalRewardPool = baseRewardAmount * 1e18; // Convert to wei equivalent
    const rewardDistribution = RewardDistributionService.calculateRewardDistribution(totalRewardPool);
    
    // Log for debugging
    console.log(`Reward from globalStats: ${globalStats.rewardSymbol} ${globalStats.rewardAmount || globalStats.totalRewards}`);
    console.log(`Total reward pool: ${totalRewardPool}`);
    console.log(`4th place should get: ${(totalRewardPool * 0.067).toLocaleString()}`);
    console.log(`Distribution:`, rewardDistribution);
    
    // Get player rank if wallet address provided
    let playerRank = null;
    let playerRewards = "0.000";
    let rewardTier = null;
    let motivationMessage = null;
    
    if (walletAddress) {
      playerRank = await gameDataService.getPlayerRank(walletAddress, timeframe);
      
      if (playerRank) {
        // Calculate actual rewards based on Top 10 distribution
        const rewardAmount = RewardDistributionService.getRewardForRank(playerRank, totalRewardPool);
        playerRewards = RewardDistributionService.formatRewardAmount(rewardAmount);
        rewardTier = RewardDistributionService.getRewardTier(playerRank);
        motivationMessage = RewardDistributionService.getRewardMotivationMessage(playerRank, totalRewardPool);
      }
    }

    return NextResponse.json({
      leaderboard: enhancedLeaderboard,
      globalStats,
      playerRank,
      playerRewards,
      rewardTier,
      motivationMessage,
      rewardDistribution,
      rewardConfig: {
        symbol: globalStats.rewardSymbol,
        amount: globalStats.rewardAmount || globalStats.totalRewards,
        description: globalStats.rewardDescription || `${globalStats.totalRewards} ${globalStats.rewardSymbol} reward pool`
      },
      timeframe
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
