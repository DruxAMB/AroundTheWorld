import { CompetitiveNotificationService } from '@/lib/competitive-notifications';
import { NextResponse } from 'next/server';

// This endpoint can be called by a cron job to periodically check for rank changes
export async function GET() {
  try {
    // Check for rank changes and send notifications
    await CompetitiveNotificationService.checkRankChanges();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Competitive notifications checked successfully' 
    });
  } catch (error) {
    console.error('Error in competitive check cron:', error);
    return NextResponse.json(
      { error: 'Failed to check competitive notifications' },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggers
export async function POST() {
  return GET();
}
