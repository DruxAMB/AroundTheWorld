import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../lib/redis';
import { setUserNotificationDetails } from '../../../lib/notification';

export async function POST(request: NextRequest) {
  try {
    const { token, url, fid, notificationDetails } = await request.json();

    if (!token || !url) {
      return NextResponse.json(
        { error: 'Token and URL are required' },
        { status: 400 }
      );
    }

    if (!redis) {
      return NextResponse.json(
        { error: 'Redis not configured' },
        { status: 500 }
      );
    }

    // Store notification token in Redis (legacy format for compatibility)
    const tokenKey = `notification_token:${token}`;
    
    await redis.hset(tokenKey, {
      token,
      url,
      fid: fid || null,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    });

    // Also maintain a set of all tokens for easy retrieval
    await redis.sadd('notification_tokens:all', token);

    // If we have FID and notification details, store them using the old frame system
    if (fid && notificationDetails) {
      await setUserNotificationDetails(fid, notificationDetails);
      console.log('User notification details saved for FID:', fid);
    }

    console.log('Notification token saved:', { token, url, fid });

    return NextResponse.json({ 
      success: true, 
      message: 'Notification token saved successfully' 
    });

  } catch (error) {
    console.error('Error saving notification token:', error);
    return NextResponse.json(
      { error: 'Failed to save notification token' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!redis) {
      return NextResponse.json(
        { error: 'Redis not configured' },
        { status: 500 }
      );
    }

    // Get all notification tokens
    const tokens = await redis.smembers('notification_tokens:all');
    
    const tokenData = [];
    for (const token of tokens) {
      const data = await redis.hgetall(`notification_token:${token}`);
      if (data && Object.keys(data).length > 0) {
        tokenData.push(data);
      }
    }

    return NextResponse.json({ tokens: tokenData });

  } catch (error) {
    console.error('Error fetching notification tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification tokens' },
      { status: 500 }
    );
  }
}
