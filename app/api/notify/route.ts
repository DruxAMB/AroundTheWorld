import { sendFrameNotification } from "@/lib/notification-client";
import { getUserNotificationDetails } from "@/lib/notification";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid, notification } = body;

    // Validate required fields
    if (!fid || typeof fid !== 'number') {
      return NextResponse.json(
        { error: 'Valid FID is required' },
        { status: 400 }
      );
    }

    if (!notification || !notification.title || !notification.body) {
      return NextResponse.json(
        { error: 'Notification title and body are required' },
        { status: 400 }
      );
    }

    // Get notification tokens from Redis
    const storedNotificationDetails = await getUserNotificationDetails(fid);
    
    if (!storedNotificationDetails) {
      console.log(`No notification tokens found for FID ${fid}`);
      return NextResponse.json(
        { 
          error: 'No notification permission found', 
          message: 'User needs to grant notification permissions first',
          fid 
        },
        { status: 404 }
      );
    }

    const result = await sendFrameNotification({
      fid,
      title: notification.title,
      body: notification.body,
      notificationDetails: storedNotificationDetails,
    });

    if (result.state === "error") {
      console.error('Frame notification error:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to send notification' },
        { status: 500 },
      );
    }

    if (result.state === "no_token") {
      return NextResponse.json(
        { error: 'No notification token available for user' },
        { status: 404 }
      );
    }

    if (result.state === "rate_limit") {
      return NextResponse.json(
        { error: 'Rate limited - too many notifications sent' },
        { status: 429 }
      );
    }

    console.log(`Notification sent successfully to FID ${fid}`);
    return NextResponse.json({ success: true, state: result.state }, { status: 200 });
    
  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
