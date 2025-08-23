import { redis } from './redis';
import { gameDataService } from '@/app/services/gameDataService';

export class BroadcastNotificationService {
  
  // Send notification to all players with FIDs
  static async broadcastToAllPlayers(title: string, body: string, notificationDetails?: Record<string, unknown>) {
    try {
      console.log(`📢 [BroadcastNotifications] Broadcasting to all players: ${title}`);
      
      // Get all players from the all-time leaderboard (most comprehensive list)
      const leaderboard = await gameDataService.getLeaderboard('all-time', 1000);
      
      // Filter players who have FIDs (can receive notifications)
      const playersWithFids = leaderboard.filter(player => 
        player.fid && typeof player.fid === 'number' && player.fid > 0
      );
      
      console.log(`Found ${playersWithFids.length} players with FIDs to notify`);
      
      if (playersWithFids.length === 0) {
        console.log('No players with FIDs found for broadcast');
        return { success: false, message: 'No players with FIDs found' };
      }
      
      // Send notifications with concurrency control (batches of 10)
      const batchSize = 10;
      let successCount = 0;
      let failureCount = 0;
      
      for (let i = 0; i < playersWithFids.length; i += batchSize) {
        const batch = playersWithFids.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (player) => {
          try {
            await this.sendBroadcastNotification(player.fid!, title, body, notificationDetails);
            successCount++;
            console.log(`✅ Sent notification to ${player.name} (FID: ${player.fid})`);
          } catch (error) {
            failureCount++;
            console.error(`❌ Failed to send notification to ${player.name} (FID: ${player.fid}):`, error);
          }
        });
        
        // Wait for current batch to complete before starting next batch
        await Promise.allSettled(batchPromises);
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < playersWithFids.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`📊 Broadcast complete: ${successCount} successful, ${failureCount} failed`);
      
      return {
        success: true,
        totalPlayers: playersWithFids.length,
        successCount,
        failureCount,
        message: `Broadcast sent to ${successCount}/${playersWithFids.length} players`
      };
      
    } catch (error) {
      console.error('Error broadcasting notifications:', error);
      return { success: false, message: 'Broadcast failed', error };
    }
  }
  
  // Send reward pool update notification
  static async broadcastRewardPoolUpdate(amount: string, symbol: string, contributor?: string) {
    const contributorText = contributor ? ` ${contributor}` : '';
    const title = `💰 Reward Pool Increased!`;
    const body = `${contributorText} just added $${amount} worth of ${symbol} to the reward pool! 🚀 Play now for bigger rewards!`;
    
    const notificationDetails = {
      type: 'reward_pool_update',
      amount,
      symbol,
      contributor: contributor || 'Anonymous',
      timestamp: new Date().toISOString()
    };
    
    return await this.broadcastToAllPlayers(title, body, notificationDetails);
  }
  
  // Send individual notification via the notify API
  private static async sendBroadcastNotification(
    fid: number, 
    title: string, 
    body: string, 
    notificationDetails?: Record<string, unknown>
  ) {
    const payload = {
      fid,
      notification: {
        title,
        body,
        notificationDetails: notificationDetails || {}
      }
    };
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to send notification: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  }
}
