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
    
    // Get global stats with dynamic reward symbol
    const globalStats = await gameDataService.getGlobalStats();
    const rewardConfig = await gameDataService.getRewardConfig();
    
    // Calculate reward pool using dynamic reward configuration
    const baseRewardAmount = parseFloat(rewardConfig.amount);
    const totalRewardPool = baseRewardAmount * 1e18; // Convert to wei equivalent
    const rewardDistribution = RewardDistributionService.calculateRewardDistribution(totalRewardPool);
    
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
      globalStats: {
        ...globalStats,
        rewardSymbol: rewardConfig.symbol
      },
      playerRank,
      playerRewards,
      rewardTier,
      motivationMessage,
      rewardDistribution,
      rewardConfig: {
        symbol: rewardConfig.symbol,
        amount: rewardConfig.amount,
        description: rewardConfig.description
      },
      timeframe
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
