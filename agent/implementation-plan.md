# Base Builder Quest Implementation Plan
**Pay-Per-Level Model with Spend Permissions (Following Base Demo Architecture)**

## Architecture Overview
- **Pay-per-level**: 0.0000092 ETH per level play (~$0.04) using ETH spend permissions
- **Daily allowance**: 0.000046 ETH spend permission (~$0.20, 5 levels max/day)
- **Smart Account system**: User Smart Account → Server Smart Account spend permissions
- **AI-powered rewards**: Automated distribution using collected fees
- **Three-account architecture**: User EOA → User Smart Account → Server Smart Account

## Implementation Steps (Following Base Demo Pattern)

### 1. Authentication Infrastructure (SIWE + Smart Accounts)
- **Create `/api/auth/verify` endpoint**: Nonce generation and signature verification
- **Implement SignInWithBase component**: 
  - `wallet_connect` with `signInWithEthereum` capabilities
  - SIWE message signing and server verification
  - Session management with HTTP-only cookies
- **Smart Account creation**: Base Account SDK creates user Smart Account during auth
- **Session-based authentication**: Secure user sessions for spend permission management

### 2. Server-Side Wallet Infrastructure
- **Update `/api/wallet/create` endpoint**: 
  - Session-based authentication checks
  - CDP Smart Account creation for server (spender)
  - Per-user server wallet mapping and persistence
- **Smart Account management**: 
  - Gas sponsorship via CDP paymaster
  - Proper wallet persistence across server restarts
  - User-specific server wallet isolation

### 3. Spend Permission System (ETH-based)
- **SpendPermissionSetup component**:
  - ETH token permissions (0x0000000000000000000000000000000000000000)
  - Base mainnet (chain ID 8453) configuration
  - Daily limit: 0.000046 ETH (~$0.20, max 5 levels)
  - User Smart Account → Server Smart Account permission granting
- **Permission management**:
  - Fetch existing permissions from user's Smart Account
  - Permission status checking and renewal
  - Revocation capabilities

### 4. Level Play Charging Integration
- **Update LevelPlayCharging component**:
  - Require authentication before showing spend permission UI
  - ETH-based charging (0.0000092 ETH per level ~$0.04)
  - Integration with Smart Account spend permission flow
  - Real-time permission status updates
- **Charge execution**:
  - Server-side spend permission execution via CDP
  - Batch transaction processing for multiple players
  - Error handling for insufficient permissions/funds

### 5. AI Agent Integration (Post-Authentication)
- **Authenticated AI operations**:
  - Session-based access to user's spend permissions
  - Gemini AI decision making for collection timing
  - Smart batching based on user activity patterns
- **Reward distribution logic**:
  - AI-powered analysis of collected fees vs reward pool
  - Automated distribution to top players
  - Integration with existing leaderboard system

### 6. Admin Monitoring & Controls
- **Authentication-aware admin panel**:
  - Session-based admin access
  - Spend permission monitoring across all users
  - Server Smart Account balance tracking
  - AI agent decision logs and manual overrides

### 7. Security & Production Readiness
- **Proper session management**: JWT tokens with secure secrets
- **Nonce storage**: Redis-based nonce management (not in-memory)
- **Error handling**: Comprehensive error states for all permission flows
- **Gas optimization**: Batch operations for multiple user transactions

## Technical Stack
- **AI Model**: Gemini 2.0 Flash (configured in .env)
- **Spend Permissions**: Base Account SDK
- **Server Wallet**: CDP SDK with smart accounts
- **Batching**: User operations for gas efficiency
- **Storage**: Redis for session tracking, pending charges