import { NextRequest, NextResponse } from 'next/server';
import RedisService, { UserData } from '../../services/redisService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }
    
    const redisService = RedisService.getInstance();
    const userData = await redisService.getUserData(address);
    const rank = await redisService.getUserRank(address);
    const scoreHistory = await redisService.getUserScoreHistory(address, 5);
    
    return NextResponse.json({ 
      userData,
      rank,
      scoreHistory
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, highestLevel, highestScore, totalGamesPlayed, achievements } = body;
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }
    
    const userData: UserData = {
      address,
      highestLevel: highestLevel || 0,
      highestScore: highestScore || 0,
      totalGamesPlayed: totalGamesPlayed || 0,
      lastPlayed: Date.now(),
      achievements
    };
    
    const redisService = RedisService.getInstance();
    const success = await redisService.saveUserData(userData);
    
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to save user data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error saving user data:', error);
    return NextResponse.json(
      { error: 'Failed to save user data' },
      { status: 500 }
    );
  }
}
