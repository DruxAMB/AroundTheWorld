import { NextRequest, NextResponse } from 'next/server';
import { gameDataService } from '../../services/gameDataService';

export async function GET() {
  try {
    const rewardConfig = await gameDataService.getRewardConfig();
    return NextResponse.json(rewardConfig);
  } catch (error) {
    console.error('Error fetching reward config:', error);
    return NextResponse.json({ error: 'Failed to fetch reward config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { symbol, amount, description } = await request.json();
    
    if (!symbol || !amount) {
      return NextResponse.json({ error: 'Symbol and amount are required' }, { status: 400 });
    }
    
    await gameDataService.setRewardConfig(symbol, amount, description);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Reward configuration updated successfully' 
    });
  } catch (error) {
    console.error('Error updating reward config:', error);
    return NextResponse.json({ error: 'Failed to update reward config' }, { status: 500 });
  }
}
