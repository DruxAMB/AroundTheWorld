import { NextRequest, NextResponse } from 'next/server';
import { leaderboardScheduler } from '@/lib/scheduler';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'start') {
      leaderboardScheduler.start();
      const nextReset = leaderboardScheduler.getNextResetTime();
      
      return NextResponse.json({
        success: true,
        message: 'Weekly reset scheduler started',
        isRunning: leaderboardScheduler.isRunning(),
        nextResetTime: nextReset.toISOString(),
        nextResetTimeFormatted: nextReset.toUTCString()
      });
      
    } else if (action === 'stop') {
      leaderboardScheduler.stop();
      
      return NextResponse.json({
        success: true,
        message: 'Weekly reset scheduler stopped',
        isRunning: leaderboardScheduler.isRunning()
      });
      
    } else if (action === 'status') {
      const nextReset = leaderboardScheduler.getNextResetTime();
      
      return NextResponse.json({
        success: true,
        isRunning: leaderboardScheduler.isRunning(),
        nextResetTime: nextReset.toISOString(),
        nextResetTimeFormatted: nextReset.toUTCString()
      });
      
    } else {
      return NextResponse.json({
        error: 'Invalid action. Use "start", "stop", or "status"'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error managing scheduler:', error);
    return NextResponse.json({
      error: 'Failed to manage scheduler',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const nextReset = leaderboardScheduler.getNextResetTime();
    
    return NextResponse.json({
      success: true,
      isRunning: leaderboardScheduler.isRunning(),
      nextResetTime: nextReset.toISOString(),
      nextResetTimeFormatted: nextReset.toUTCString()
    });
  } catch (error) {
    console.error('Error getting scheduler status:', error);
    return NextResponse.json({
      error: 'Failed to get scheduler status'
    }, { status: 500 });
  }
}
