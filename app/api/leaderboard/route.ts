import { NextRequest, NextResponse } from 'next/server';
import { gameDataService } from '../../services/gameDataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as 'week' | 'month' | 'all-time' || 'all-time';
    const limit = parseInt(searchParams.get('limit') || '50');
    const walletAddress = searchParams.get('address');

    // Get leaderboard data (now includes stored Farcaster profile data)
    const leaderboard = await gameDataService.getLeaderboard(timeframe, limit);
    
    // Get global stats
    const globalStats = await gameDataService.getGlobalStats();
    
    // Get player rank if wallet address provided
    let playerRank = null;
    let playerRewards = "0.000";
    
    if (walletAddress) {
      playerRank = await gameDataService.getPlayerRank(walletAddress, timeframe);
      
      if (playerRank) {
        // Calculate rewards based on rank (mock calculation)
        const baseReward = 0.1;
        const rankMultiplier = Math.max(0.1, 1 - (playerRank - 1) * 0.01);
        playerRewards = (baseReward * rankMultiplier).toFixed(3);
      }
    }

    return NextResponse.json({
      leaderboard,
      globalStats,
      playerRank,
      playerRewards,
      timeframe
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
