# Redis Optimization Documentation

## Reward Data Consolidation

### Problem
The application was storing reward configuration in two separate Redis keys:
- `reward:config` - Admin configuration for reward symbol and amount
- `global:stats` - Global game statistics including duplicate reward data

This redundancy doubled Redis calls for reward-related operations, contributing to hitting the 500,000 request limit.

### Solution
We consolidated all reward data into `global:stats` with the following changes:

1. Enhanced `global:stats` to store all reward fields:
   - `rewardSymbol` (previously available)
   - `rewardAmount` (new field, previously `amount` in reward:config)
   - `rewardDescription` (new field, previously `description` in reward:config)
   - `totalRewards` (maintained for backward compatibility)

2. Modified key functions to use the consolidated data structure:
   - `setRewardConfig()` - Now updates global:stats directly (with backward compatibility)
   - `getRewardConfig()` - Prioritizes reading from global:stats, with reward:config as fallback
   - `updateGlobalStats()` - Preserves existing reward data when updating other stats
   - `getGlobalStats()` - Returns enhanced structure with all reward fields

3. Simplified the leaderboard API:
   - Gets all reward data from globalStats in a single Redis call
   - Maintains backward compatibility in the response

### Migration
Run the migration script to consolidate existing data:

```
npm run ts-node scripts/migrate-reward-data.ts
```

This script:
- Fetches both `global:stats` and `reward:config`
- Merges the data with reward:config having priority
- Updates `global:stats` with the consolidated information

### Benefits
- ~50% reduction in Redis calls for reward-related operations
- Simplified codebase with a single source of truth
- Maintained backward compatibility for existing code

### Future Improvements
- After verifying stability, remove redundant `reward:config` updates
- Consider implementing a Redis request rate limiter
- Add cache layer for frequently accessed data
