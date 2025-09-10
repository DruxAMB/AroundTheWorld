# Base Builder Quest Implementation Plan
**Pay-Per-Level Model with AI Agent Batching**

## Architecture Overview
- **Pay-per-level**: $0.04 per level play
- **Daily allowance**: $0.2 spend permission (5 levels max/day)
- **Batched collections**: AI agent collects fees periodically + on miniApp close
- **AI-powered rewards**: Automated distribution to top players using collected fees
- **Gemini AI Agent**: Using gemini-2.0-flash-001 for intelligent decision making

## Implementation Steps

### 1. Level Play Charging System
- Build UI component for granting $0.2 daily spend permission
- Implement $0.04 charge tracking per level play (local storage)
- Create "pending charges" display in game UI
- Integration with existing level selection/play components

### 2. AI Agent Batching Logic
- **Periodic collection**: Every 10-15 minutes, collect accumulated charges
- **Session-end collection**: Batch remaining charges on miniApp close
- **Smart batching**: Use Gemini AI to optimize collection timing
- Store pending charges in Redis with player session data

### 3. CDP Smart Account Integration
- Use existing CDP smart account for receiving batched payments
- Implement spend permission execution via user operations
- Handle batch transaction failures and retries
- Gas-optimized batching for multiple players simultaneously

### 4. AI-Powered Reward Distribution
- **Gemini AI logic**: Analyze collected fees vs reward pool needs
- **Smart triggers**: Determine optimal reward distribution timing
- **Dynamic amounts**: AI calculates reward amounts based on participation
- Integration with existing leaderboard and reward systems

### 5. Level Play Integration
- Modify existing level play flow to check spend permissions
- Add charge tracking to level completion events
- Display pending charges and permission status
- Handle permission expiry and renewal prompts

### 6. Admin Monitoring & Controls
- Add spend permission monitoring to /update panel
- Display batching status and collected fees
- AI agent decision logs and override capabilities
- Real-time collection and distribution analytics

### 7. Base Builder Quest Features
- **Client-side spend permissions**: Base Account SDK integration
- **CDP server wallet**: Smart account for automated collections
- **AI agent access**: Gemini-powered fund management decisions
- **Grant/revoke system**: Full permission lifecycle management

## Technical Stack
- **AI Model**: Gemini 2.0 Flash (configured in .env)
- **Spend Permissions**: Base Account SDK
- **Server Wallet**: CDP SDK with smart accounts
- **Batching**: User operations for gas efficiency
- **Storage**: Redis for session tracking, pending charges