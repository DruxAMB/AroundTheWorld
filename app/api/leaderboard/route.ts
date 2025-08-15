import { NextRequest, NextResponse } from 'next/server';
import { gameDataService } from '../../services/gameDataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') as 'week' | 'month' | 'all-time' || 'all-time';
    const limit = parseInt(searchParams.get('limit') || '50');
    const walletAddress = searchParams.get('address');

    console.log(`🏆 [LEADERBOARD API] Fetching leaderboard - Timeframe: ${timeframe}, Limit: ${limit}, Address: ${walletAddress}`);

    // Get leaderboard data
    const leaderboard = await gameDataService.getLeaderboard(timeframe, limit);
    console.log(`📊 [LEADERBOARD API] Leaderboard data (${leaderboard.length} entries):`, leaderboard);
    
    // Get global stats
    const globalStats = await gameDataService.getGlobalStats();
    console.log(`📈 [LEADERBOARD API] Global stats:`, globalStats);
    
    // Get player rank if wallet address provided
    let playerRank = null;
    let playerRewards = "0.000";
    
    if (walletAddress) {
      console.log(`🔍 [LEADERBOARD API] Getting player rank for ${walletAddress}`);
      playerRank = await gameDataService.getPlayerRank(walletAddress, timeframe);
      console.log(`🎯 [LEADERBOARD API] Player rank:`, playerRank);
      
      if (playerRank) {
        // Calculate rewards based on rank (mock calculation)
        const baseReward = 0.1;
        const rankMultiplier = Math.max(0.1, 1 - (playerRank - 1) * 0.01);
        playerRewards = (baseReward * rankMultiplier).toFixed(3);
        console.log(`💰 [LEADERBOARD API] Player rewards calculated: ${playerRewards}`);
      }
    }

    const responseData = {
      leaderboard,
      globalStats,
      playerRank,
      playerRewards,
      timeframe
    };

    console.log(`✅ [LEADERBOARD API] Complete response:`, responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('❌ [LEADERBOARD API] Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
