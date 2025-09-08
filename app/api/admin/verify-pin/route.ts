import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

// Redis key for storing the admin PIN
const ADMIN_PIN_KEY = 'admin:pin';

// Default PIN to set if none exists (for initial setup)
const DEFAULT_PIN = '123456';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    
    if (!pin) {
      return NextResponse.json({ success: false, error: 'PIN is required' }, { status: 400 });
    }
    
    // Check if Redis is available
    if (!redis) {
      console.error('Redis is not configured, cannot verify PIN');
      return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }

    // Check if PIN exists in Redis
    let storedPin = await redis.get(ADMIN_PIN_KEY);
    
    // If no PIN is set yet, set the default PIN
    if (!storedPin) {
      await redis.set(ADMIN_PIN_KEY, DEFAULT_PIN);
      storedPin = DEFAULT_PIN;
      console.log('Admin PIN initialized with default value');
    }
    
    // Compare the provided PIN with the stored PIN
    const isValid = pin === storedPin;
    
    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      // Add a small delay to prevent brute force attacks
      await new Promise(resolve => setTimeout(resolve, 500));
      return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error verifying admin PIN:', error);
    return NextResponse.json({ success: false, error: 'Failed to verify PIN' }, { status: 500 });
  }
}

// Endpoint to update the PIN (only accessible if already authenticated)
export async function PUT(request: NextRequest) {
  try {
    const { currentPin, newPin } = await request.json();
    
    if (!currentPin || !newPin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Current PIN and new PIN are required' 
      }, { status: 400 });
    }
    
    // Check if Redis is available
    if (!redis) {
      console.error('Redis is not configured, cannot update PIN');
      return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
    }

    // Check if the current PIN matches
    const storedPin = await redis.get(ADMIN_PIN_KEY);
    
    if (currentPin !== storedPin) {
      return NextResponse.json({ success: false, error: 'Current PIN is incorrect' }, { status: 401 });
    }
    
    // Validate the new PIN format
    if (!/^\d{4,6}$/.test(newPin)) {
      return NextResponse.json({ 
        success: false, 
        error: 'New PIN must be 4-6 digits' 
      }, { status: 400 });
    }
    
    // Update the PIN - redis is already checked above, so we know it's not null here
    await redis.set(ADMIN_PIN_KEY, newPin);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating admin PIN:', error);
    return NextResponse.json({ success: false, error: 'Failed to update PIN' }, { status: 500 });
  }
}
