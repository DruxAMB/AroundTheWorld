import { NextRequest, NextResponse } from 'next/server';
import { BroadcastNotificationService } from '@/lib/broadcast-notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, body: messageBody, amount, symbol, contributor, link } = body;

    // Validate required fields based on type
    if (!type) {
      return NextResponse.json(
        { error: 'Type is required' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'reward_pool_update':
        if (!amount || !symbol) {
          return NextResponse.json(
            { error: 'Amount and symbol are required for reward pool updates' },
            { status: 400 }
          );
        }
        result = await BroadcastNotificationService.broadcastRewardPoolUpdate(
          amount, 
          symbol, 
          contributor
        );
        break;

      case 'general':
        if (!title || !messageBody) {
          return NextResponse.json(
            { error: 'Title and body are required for general announcements' },
            { status: 400 }
          );
        }
        result = await BroadcastNotificationService.broadcastToAllPlayers(
          title,
          messageBody,
          { 
            type: 'general_announcement', 
            timestamp: new Date().toISOString(),
            ...(link && { link })
          }
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid broadcast type. Use "reward_pool_update" or "general"' },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }

  } catch (error) {
    console.error('Broadcast API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
