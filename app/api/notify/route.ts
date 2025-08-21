import { sendFrameNotification } from "@/lib/notification-client";
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

    const result = await sendFrameNotification({
      fid,
      title: notification.title,
      body: notification.body,
      notificationDetails: notification.notificationDetails || {},
    });

    if (result.state === "error") {
      console.error('Frame notification error:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to send notification' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
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
