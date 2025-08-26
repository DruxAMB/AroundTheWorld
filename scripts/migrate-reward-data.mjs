/**
 * Reward Data Migration Script (JavaScript version)
 * 
 * This script consolidates reward data from reward:config into global:stats
 * to reduce Redis calls and simplify the reward configuration system.
 */

// Import Redis directly
import { Redis } from '@upstash/redis';

// Initialize Redis client similar to the one in lib/redis.js
const redis = process.env.REDIS_URL && process.env.REDIS_TOKEN
  ? new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    })
  : null;

// Check if Redis is available
if (!redis) {
  console.error('Redis client not available. Please check environment variables REDIS_URL and REDIS_TOKEN.');
  process.exit(1);
}

// Reference to redis client for use in the script
const redisClient = redis;

async function migrateRewardData() {
  console.log('🔄 Starting reward data migration...');
  
  try {
    // Step 1: Fetch data from both sources
    const globalStats = await redisClient.hgetall('global:stats');
    const rewardConfig = await redisClient.hgetall('reward:config');
    
    console.log('📊 Current global:stats:', globalStats);
    console.log('⚙️ Current reward:config:', rewardConfig);
    
    // Step 2: Check if we have valid data to migrate
    if (!rewardConfig || Object.keys(rewardConfig).length === 0) {
      console.log('⚠️ No reward:config data found. Nothing to migrate.');
      return;
    }
    
    // Step 3: Create consolidated stats object
    const consolidatedStats = {
      ...globalStats,
      // Add new reward fields
      rewardSymbol: rewardConfig.symbol || globalStats.rewardSymbol || 'ETH',
      rewardAmount: rewardConfig.amount || globalStats.totalRewards || '1.000',
      rewardDescription: rewardConfig.description || 
                        `${rewardConfig.amount || globalStats.totalRewards || '1.000'} ${rewardConfig.symbol || globalStats.rewardSymbol || 'ETH'} reward pool`,
      // Ensure backwards compatibility
      totalRewards: rewardConfig.amount || globalStats.totalRewards || '1.000',
      // Update timestamp
      lastUpdated: new Date().toISOString()
    };
    
    // Step 4: Save consolidated data
    await redisClient.hset('global:stats', consolidatedStats);
    
    console.log('✅ Migration completed successfully!');
    console.log('📈 New global:stats:', consolidatedStats);
    
    // Return stats for confirmation
    return {
      before: {
        globalStats,
        rewardConfig
      },
      after: consolidatedStats
    };
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Execute migration when script is run directly
// Using a self-executing async function for top-level await
(async () => {
  try {
    await migrateRewardData();
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
