import { NextRequest, NextResponse } from 'next/server';
import { gameDataService } from '@/app/services/gameDataService';

export async function POST(request: NextRequest) {
  try {
    // You might want to add authentication here to ensure only admins can access this
    // For example: if (!await isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { timeframe } = await request.json();
    
    if (!timeframe || !['week', 'month', 'all-time'].includes(timeframe)) {
      return NextResponse.json({ error: 'Invalid timeframe. Must be one of: week, month, all-time' }, { status: 400 });
    }
    
    // Reset the specified leaderboard
    const result = await gameDataService.resetLeaderboard(timeframe);
    
    // Create a descriptive message
    let message = `Successfully reset ${timeframe} leaderboard`;
    if (result.playersReset && result.playersReset > 0) {
      message += ` and reset ${result.playersReset} player scores to 0`;
    }
    
    return NextResponse.json({ 
      success: true, 
      message,
      timestamp: new Date().toISOString(),
      result
    });
  } catch (error) {
    console.error('Error resetting leaderboard:', error);
    return NextResponse.json({ error: 'Failed to reset leaderboard' }, { status: 500 });
  }
}
