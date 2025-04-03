import { NextRequest, NextResponse } from 'next/server';
import RedisService from '../../services/redisService';
import { LeaderboardEntry } from '../../utils/gameTypes';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const redisService = RedisService.getInstance();
    const leaderboard = await redisService.getTopScores(limit);
    
    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, score, level } = body;
    
    if (!address || score === undefined || level === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const entry: LeaderboardEntry = {
      address: address as `0x${string}`,
      score,
      level,
      timestamp: Date.now()
    };
    
    const redisService = RedisService.getInstance();
    const success = await redisService.addScore(entry);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to add score' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error adding score:', error);
    return NextResponse.json(
      { error: 'Failed to add score' },
      { status: 500 }
    );
  }
}
