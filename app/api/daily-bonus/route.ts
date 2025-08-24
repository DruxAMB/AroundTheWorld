import { NextRequest, NextResponse } from 'next/server';
import { dailyBonusService } from '../../../lib/daily-bonus';
import { gameDataService } from '../../services/gameDataService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, action } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'claim':
        return await handleClaimBonus(walletAddress);
      case 'status':
        return await handleGetStatus(walletAddress);
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "claim" or "status"' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Daily bonus API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleClaimBonus(walletAddress: string) {
  try {
    // Check if already claimed today
    const alreadyClaimed = await dailyBonusService.hasClaimedToday(walletAddress);
    if (alreadyClaimed) {
      return NextResponse.json({
        success: false,
        message: 'Daily bonus already claimed today',
        bonusAmount: 0,
        alreadyClaimed: true
      });
    }

    // Claim the bonus
    const claimResult = await dailyBonusService.claimDailyBonus(walletAddress);
    
    if (!claimResult.success) {
      return NextResponse.json({
        success: false,
        message: claimResult.message,
        bonusAmount: 0
      });
    }

    // Add bonus points to player's total score and update leaderboards
    await gameDataService.addBonusPoints(walletAddress, claimResult.bonusAmount);

    // Get updated status
    const [streak, totalBonus] = await Promise.all([
      dailyBonusService.getCurrentStreak(walletAddress),
      dailyBonusService.getTotalBonusPoints(walletAddress)
    ]);

    return NextResponse.json({
      success: true,
      message: claimResult.message,
      bonusAmount: claimResult.bonusAmount,
      streak,
      totalBonusPoints: totalBonus,
      alreadyClaimed: false
    });
  } catch (error) {
    console.error('Error claiming daily bonus:', error);
    return NextResponse.json(
      { error: 'Failed to claim daily bonus' },
      { status: 500 }
    );
  }
}

async function handleGetStatus(walletAddress: string) {
  try {
    const [alreadyClaimed, bonusData, streak, totalBonus] = await Promise.all([
      dailyBonusService.hasClaimedToday(walletAddress),
      dailyBonusService.getTodaysBonusData(walletAddress),
      dailyBonusService.getCurrentStreak(walletAddress),
      dailyBonusService.getTotalBonusPoints(walletAddress)
    ]);

    return NextResponse.json({
      alreadyClaimed,
      bonusData,
      streak,
      totalBonusPoints: totalBonus,
      availableBonusAmount: 100 // Default bonus amount
    });
  } catch (error) {
    console.error('Error getting daily bonus status:', error);
    return NextResponse.json(
      { error: 'Failed to get bonus status' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  return await handleGetStatus(walletAddress);
}
