# Base Builder Quest Implementation Plan
**Admin Reward Distribution with Spend Permissions (MiniApp Compatible)**

## Architecture Overview
- **Admin-controlled**: Weekly reward pool set via admin spend permissions
- **Weekly reward pool**: Admin grants spend permission for total rewards (e.g., 0.1 ETH)
- **AI-powered distribution**: Gemini analyzes leaderboard positions and calculates reward percentages
- **Automated distribution**: Server executes batch transfers to top players
- **MiniApp compatible**: No individual user spend permissions required

## Implementation Steps (Following Base Demo Pattern)

### 1. Admin Authentication & Wallet Setup
- **Admin-only authentication**: Use existing SignInWithBase for admin access
- **Admin Smart Account**: Create dedicated admin Smart Account with spend permissions enabled
- **Weekly reward wallet**: Server Smart Account to receive and distribute rewards

### 2. Admin Spend Permission Interface
- **Admin reward setup page**: Interface to set weekly reward pool amount
- **Spend permission granting**: Admin grants permission for weekly total (e.g., 0.1 ETH)
- **Permission management**: View, update, and revoke admin spend permissions
- **Reward pool tracking**: Monitor available funds and distribution history

### 3. Gemini AI Reward Calculator
- **Leaderboard analysis**: Fetch current week's leaderboard data
- **Position-based percentages**: AI calculates reward distribution based on rankings
- **Reward allocation logic**: 
  - Top 10% get 50% of pool
  - Next 20% get 30% of pool  
  - Next 30% get 20% of pool
- **AI decision logging**: Track Gemini's reward calculation reasoning

### 4. Automated Reward Distribution
- **Weekly distribution trigger**: Automated or manual trigger for reward distribution
- **Batch transfer execution**: Use existing CDP Smart Account for batch transfers
- **Distribution verification**: Confirm all transfers completed successfully
- **Player notifications**: Notify winners of their rewards via existing notification system

### 5. Admin Monitoring Dashboard
- **Reward pool status**: Current balance, pending distributions, history
- **AI decision logs**: View Gemini's reward calculation decisions
- **Distribution analytics**: Track reward distribution patterns and player engagement
- **Manual overrides**: Admin ability to adjust AI recommendations

### 6. Integration with Existing Systems
- **Leaderboard integration**: Use existing leaderboard data for reward calculations
- **Notification system**: Leverage existing competitive notifications for reward alerts
- **Admin panel integration**: Add reward management to existing /update admin interface

## Technical Stack
- **AI Model**: Gemini 2.0 Flash (configured in .env)
- **Spend Permissions**: Base Account SDK
- **Server Wallet**: CDP SDK with smart accounts
- **Batching**: User operations for gas efficiency
- **Storage**: Redis for session tracking, pending charges