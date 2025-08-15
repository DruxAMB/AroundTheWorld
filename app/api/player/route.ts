import { NextRequest, NextResponse } from 'next/server';
import { gameDataService } from '../../services/gameDataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const player = await gameDataService.getPlayer(address);
    const progress = await gameDataService.getGameProgress(address);
    const settings = await gameDataService.getPlayerSettings(address);

    return NextResponse.json({
      player,
      progress,
      settings
    });
  } catch (error) {
    console.error('Error fetching player data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

      case 'checkNameAvailability':
        const isAvailable = await gameDataService.checkNameAvailability(data.name, walletAddress);
        return NextResponse.json({ available: isAvailable });

      case 'updateName':
        try {
          await gameDataService.updatePlayerName(walletAddress, data.name);
          return NextResponse.json({ success: true });
        } catch (error) {
          return NextResponse.json({ error: (error as Error).message }, { status: 400 });
        }

      case 'saveProgress':
        await gameDataService.saveGameProgress(walletAddress, data.progress);
        return NextResponse.json({ success: true });

      case 'saveSettings':
        await gameDataService.savePlayerSettings(walletAddress, data.settings);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error occurred:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
