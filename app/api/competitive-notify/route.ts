import { CompetitiveNotificationService } from '@/lib/competitive-notifications';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, playerFid, playerName, score } = body;

    switch (type) {
      case 'score_update':
        // Check if this new score beats other players
        await CompetitiveNotificationService.checkScoreBeaten(score, playerFid, playerName);
        break;
        
      case 'rank_check':
        // Check for rank changes and near-top-10 notifications
        await CompetitiveNotificationService.checkRankChanges();
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing competitive notification:', error);
    return NextResponse.json(
      { error: 'Failed to process notification' },
      { status: 500 }
    );
  }
}
