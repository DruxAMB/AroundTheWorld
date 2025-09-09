# Base Builder Quest - Spend Permissions Setup Guide

## Environment Variables Required

Add these to your `.env` file:

```bash
# CDP SDK Configuration (uses default credentials from CDP CLI)
# No additional environment variables needed for CDP SDK
# The CdpClient() will automatically use your CDP CLI configuration

# Automated Trigger Security
AUTOMATED_TRIGGER_SECRET=your_secure_random_string

# Base URL for API calls
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Existing Redis Configuration (already have these)
REDIS_URL=your_upstash_redis_url
REDIS_TOKEN=your_upstash_redis_token
```

## Setup Steps

### 1. Install CDP CLI and Configure
```bash
# Install CDP CLI
npm install -g @coinbase/cdp-cli

# Configure CDP with your API credentials
cdp configure
```
Follow the prompts to add your CDP API key and private key.

### 2. Install Required Packages
```bash
# Install CDP SDK and viem
npm install @coinbase/cdp-sdk viem
```

### 3. Initialize CDP Wallet
```bash
# Run the app and check logs for wallet creation
npm run dev
```
The system will automatically create a server wallet with gas sponsorship.

### 3. Fund the Reward Wallet
Transfer ETH to the generated wallet address for reward distribution.

### 4. Configure Spend Permissions
Users can grant spending permissions through the admin panel at `/update`.

## Architecture Overview

### Components Created:
- **SpendPermissionManager**: UI for users to grant/revoke spending permissions
- **RewardDistributionPanel**: Admin interface for managing reward distributions
- **AI Agent**: Automated decision engine for reward distribution
- **CDP Wallet Integration**: Server-side wallet for executing transactions

### API Endpoints:
- `POST /api/rewards/distribute`: Execute reward distribution
- `GET /api/rewards/distribute`: Check distribution status and history
- `POST /api/admin/verify-pin`: Admin authentication

### AI Agent Features:
- Evaluates when to distribute rewards based on game state
- Integrates with existing leaderboard reset system
- Supports manual and automated triggers
- Implements security checks and balance validation

## Base Builder Quest Submission

**Architecture**: 
- Users grant Spend Permissions to CDP server wallet
- AI agent automatically distributes rewards based on leaderboard performance
- Integrated with existing game infrastructure (Redis, Farcaster notifications)
- Secure admin controls with PIN authentication

**Unique Value**:
- Gaming-first implementation of Spend Permissions
- Social layer through Farcaster integration
- Proven user base and engagement
- Automated reward distribution based on actual gameplay

## Security Features
- PIN-protected admin access
- Automated trigger secret validation
- Balance checks before distribution
- Transaction history and audit trail
- Spend permission revocation capabilities

## Testing
1. Set up CDP credentials
2. Fund the reward wallet
3. Grant spend permissions through the UI
4. Test manual reward distribution via admin panel
5. Trigger automated distribution through leaderboard reset
