// script: curl -X POST http://localhost:3000/api/admin/reset-player-scores -H "Content-Type: application/json"
// {"success":true,"message":"Reset totalScore and progress for 348 players. Deleted 206 progress keys.","playersReset":348,"progressKeysDeleted":206,"timestamp":"2025-09-15T17:53:45.931Z"}
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    if (!redis) {
      return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
    }

    let playersReset = 0;
    let progressKeysDeleted = 0;

    // Use SCAN to find all player keys
    const allPlayerKeys: string[] = [];
    let cursor = 0;
    
    do {
      const result = await redis.scan(cursor, {
        match: 'player:*',
        count: 1000
      });
      cursor = Number(result[0]);
      allPlayerKeys.push(...result[1]);
    } while (cursor !== 0);

    // Separate player profile keys from progress/settings keys
    const playerProfileKeys = allPlayerKeys.filter(key => 
      !key.includes(':progress') && 
      !key.includes(':settings') && 
      !key.includes(':backup')
    );
    const progressKeys = allPlayerKeys.filter(key => key.includes(':progress'));
    const settingsKeys = allPlayerKeys.filter(key => key.includes(':settings'));
    
    console.log(`📊 Found ${allPlayerKeys.length} total keys:`);
    console.log(`  - ${playerProfileKeys.length} player profiles`);
    console.log(`  - ${progressKeys.length} progress keys`);
    console.log(`  - ${settingsKeys.length} settings keys`);

    // Delete all progress keys
    if (progressKeys.length > 0) {
      await redis.del(...progressKeys);
      progressKeysDeleted = progressKeys.length;
    }

    // Reset only totalScore for each player profile
    for (const playerKey of playerProfileKeys) {
      try {
        const playerData = await redis.hgetall(playerKey);
        
        if (playerData && Object.keys(playerData).length > 0) {
          // Only reset totalScore - preserve everything else
          await redis.hset(playerKey, {
            totalScore: 0
          });

          // Create empty progress array
          await redis.set(`${playerKey}:progress`, JSON.stringify([]));
          
          playersReset++;
        }
      } catch (error) {
        console.error(`Error resetting player ${playerKey}:`, error);
      }
    }

    const message = `Reset totalScore and progress for ${playersReset} players. Deleted ${progressKeysDeleted} progress keys.`;
    
    return NextResponse.json({ 
      success: true, 
      message,
      playersReset,
      progressKeysDeleted,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error resetting player scores:', error);
    return NextResponse.json({ 
      error: 'Failed to reset player scores',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
