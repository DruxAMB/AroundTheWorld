import { NextRequest, NextResponse } from 'next/server';
import { gameDataService } from '../../services/gameDataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    console.log(`🔍 [API] Fetching player data for address: ${address}`);

    const player = await gameDataService.getPlayer(address);
    console.log(`👤 [API] Player data:`, player);

    const progress = await gameDataService.getGameProgress(address);
    console.log(`📊 [API] Progress data:`, progress);

    const settings = await gameDataService.getPlayerSettings(address);
    console.log(`⚙️ [API] Settings data:`, settings);

    const responseData = {
      player,
      progress,
      settings
    };

    console.log(`✅ [API] Complete response data:`, responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('❌ [API] Error fetching player data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, action, data } = body;

    console.log(`🔄 [API POST] Action: ${action}, Address: ${walletAddress}, Data:`, data);

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    switch (action) {
      case 'createOrUpdate':
        console.log(`👤 [API] Creating/updating player for ${walletAddress}`);
        const player = await gameDataService.createOrUpdatePlayer(walletAddress, data);
        console.log(`✅ [API] Player created/updated:`, player);
        return NextResponse.json({ player });

      case 'checkNameAvailability':
        console.log(`🔍 [API] Checking name availability: "${data.name}" for ${walletAddress}`);
        const isAvailable = await gameDataService.checkNameAvailability(data.name, walletAddress);
        console.log(`✅ [API] Name "${data.name}" availability:`, isAvailable);
        return NextResponse.json({ available: isAvailable });

      case 'updateName':
        try {
          console.log(`📝 [API] Updating name to "${data.name}" for ${walletAddress}`);
          await gameDataService.updatePlayerName(walletAddress, data.name);
          console.log(`✅ [API] Name updated successfully`);
          return NextResponse.json({ success: true });
        } catch (error) {
          console.error(`❌ [API] Name update failed:`, error);
          return NextResponse.json({ error: (error as Error).message }, { status: 400 });
        }

      case 'saveProgress':
        console.log(`💾 [API] Saving progress for ${walletAddress}:`, data.progress);
        await gameDataService.saveGameProgress(walletAddress, data.progress);
        console.log(`✅ [API] Progress saved successfully`);
        return NextResponse.json({ success: true });

      case 'saveSettings':
        console.log(`⚙️ [API] Saving settings for ${walletAddress}:`, data.settings);
        await gameDataService.savePlayerSettings(walletAddress, data.settings);
        console.log(`✅ [API] Settings saved successfully`);
        return NextResponse.json({ success: true });

      default:
        console.error(`❌ [API] Invalid action: ${action}`);
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ [API] Error occurred:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
