import { NextRequest, NextResponse } from 'next/server';
import { gameDataService } from '../../services/gameDataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    const player = await gameDataService.getPlayer(walletAddress);
    const progress = await gameDataService.getGameProgress(walletAddress);
    const settings = await gameDataService.getPlayerSettings(walletAddress);

    return NextResponse.json({
      player,
      progress,
      settings
    });
  } catch (error) {
    console.error('Error fetching player data:', error);
    return NextResponse.json({ error: 'Failed to fetch player data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, action, data } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    switch (action) {
      case 'createOrUpdate':
        const player = await gameDataService.createOrUpdatePlayer(walletAddress, data);
        return NextResponse.json({ player });

      case 'updateName':
        await gameDataService.updatePlayerName(walletAddress, data.name);
        return NextResponse.json({ success: true });

      case 'saveProgress':
        await gameDataService.saveGameProgress(walletAddress, data.progress);
        return NextResponse.json({ success: true });

      case 'saveSettings':
        await gameDataService.savePlayerSettings(walletAddress, data.settings);
        return NextResponse.json({ success: true });

      case 'migrate':
        await gameDataService.migrateFromLocalStorage(walletAddress);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating player data:', error);
    return NextResponse.json({ error: 'Failed to update player data' }, { status: 500 });
  }
}
