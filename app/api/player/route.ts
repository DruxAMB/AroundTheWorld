import { NextRequest, NextResponse } from 'next/server';
import { gameDataService } from '../../services/gameDataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    console.log('🔍 API: Fetching player data for address:', address);

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    console.log('📡 API: Calling gameDataService methods...');
    const player = await gameDataService.getPlayer(address);
    const progress = await gameDataService.getGameProgress(address);
    const settings = await gameDataService.getPlayerSettings(address);

    console.log('👤 API: Player from Redis:', player);
    console.log('🎮 API: Progress from Redis:', progress);
    console.log('⚙️ API: Settings from Redis:', settings);

    const response = {
      player,
      progress,
      settings
    };

    console.log('📤 API: Sending response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ API: Error fetching player data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, action, data } = body;

    console.log('📥 API POST: Received request:', { walletAddress, action, data });

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    switch (action) {
      case 'createOrUpdate':
        console.log('🆕 API POST: Creating/updating player');
        const player = await gameDataService.createOrUpdatePlayer(walletAddress, data);
        return NextResponse.json({ player });

      case 'updateName':
        console.log('📝 API POST: Updating player name');
        await gameDataService.updatePlayerName(walletAddress, data.name);
        return NextResponse.json({ success: true });

      case 'saveProgress':
        console.log('💾 API POST: Saving progress data:', data.progress);
        await gameDataService.saveGameProgress(walletAddress, data.progress);
        console.log('✅ API POST: Progress saved successfully');
        return NextResponse.json({ success: true });

      case 'saveSettings':
        console.log('⚙️ API POST: Saving settings');
        await gameDataService.savePlayerSettings(walletAddress, data.settings);
        return NextResponse.json({ success: true });

      default:
        console.log('❌ API POST: Invalid action:', action);
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ API POST: Error occurred:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
