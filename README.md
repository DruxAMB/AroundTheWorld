# Nextjs Build

**Match your way around the world.**

A captivating match-3 puzzle game that takes players on a cultural journey across five vibrant regions: Africa, India, Latin America, Southeast Asia, and Europe. Built with cutting-edge web3 technology on Base, Around the World transforms casual gaming into meaningful on-chain experiences.

## Why Onchain?

Traditional mobile games trap your progress on a single device or centralized server. Around the World liberates your achievements by storing them permanently on the blockchain, creating true digital ownership of your gaming accomplishments.

**🔗 Persistent Progress**: Your scores, level completions, and achievements are permanently recorded on-chain, accessible from any device, forever.

**🏆 Real Competition**: Weekly leaderboards with ETH rewards turn skill into tangible value, creating genuine stakes in casual gaming.

**🌐 Global Community**: Connect with players worldwide through verifiable, transparent competition that transcends traditional gaming silos.

## Game Features

### 🎮 Core Gameplay
- **Classic Match-3 Mechanics**: Swap adjacent items to create matches of 3 or more
- **Special Power-ups**: Create striped, wrapped, and color bomb candies with strategic matches
- **Chain Reactions**: Cascading matches create satisfying combo chains and higher scores
- **Auto-Reshuffle**: Smart board management prevents unwinnable states

### 🗺️ Cultural Journey
- **5 Themed Levels**: Each region features unique visual assets and authentic cultural elements
- **Regional Soundtracks**: Immersive audio experiences featuring music from each region
- **Progressive Difficulty**: Carefully balanced challenge curve keeps players engaged
- **Cultural Authenticity**: Respectful representation of diverse global cultures

### 🏆 Rewards & Social Features
- **NFT Collectibles**: Mint unique winner badges for each completed level (0.0002 ETH)
- **Farcaster Integration**: Share achievements and scores directly to social feeds
- **Global Leaderboards**: Real-time rankings with weekly competitions
- **AI-Powered Reward Distribution**: Automated weekly ETH rewards based on leaderboard performance
- **Spend Permissions**: Seamless reward distribution through Base's spend permission system
- **Player Profiles**: Comprehensive stats tracking and achievement systems
- **Social Sharing**: Connect with the gaming community through verifiable achievements

### 🎨 Technical Excellence
- **Smooth Animations**: Framer Motion powers fluid, satisfying visual feedback
- **Responsive Design**: Optimized for mobile-first gameplay
- **Sound Design**: Rich audio feedback enhances every interaction
- **Performance Optimized**: Fast loading and smooth gameplay across devices

## Smart Contract Integration

### PlayerRegistry Contract
**Contract Address**: `0x654a8aa6edf449f92229231b9754404bf22b9ade` (Base Mainnet)
**[View on BaseScan](https://basescan.org/address/0x654a8aa6edf449f92229231b9754404bf22b9ade)**

Our PlayerRegistry smart contract creates permanent, verifiable records of all game participants:

#### Features
- **Automatic Registration**: New players are registered on-chain when they join
- **Transparent Participation**: All player addresses are publicly verifiable
- **Gas Efficient**: Optimized contract design minimizes transaction costs
- **Decentralized Identity**: Wallet-based authentication eliminates traditional accounts

#### Contract Functions
- `register()`: Register a new player address on-chain
- `isRegistered(address)`: Check if an address is already registered
- `getTotalPlayers()`: Get the total number of registered players
- `players(uint256)`: Access the list of registered player addresses

### NFT Rewards Contract
**Contract Address**: `0x8bb8ba7e4dc947107c6fa88ad13da4eccff49651` (Base Mainnet)
**[View on BaseScan](https://basescan.org/address/0x8bb8ba7e4dc947107c6fa88ad13da4eccff49651)**

The NFT contract enables players to mint collectible winner badges for completed levels:

#### Features
- **Level-Based Minting**: Unique NFTs for each of the 5 regional levels
- **Affordable Pricing**: 0.0002 ETH per NFT mint
- **Multiple Mints**: Players can mint multiple NFTs per completed level
- **Regional Artwork**: Each level features distinct cultural artwork

#### Contract Functions
- `mint(uint256 levelId)`: Mint an NFT for a completed level
- `mintsPerLevel(address, uint256)`: Check how many NFTs a player has minted for a specific level
- `mintPrice()`: Get current minting price

### Web3 Integration
- **Seamless Wallet Connection**: OnchainKit and MiniKit integration
- **Cross-Device Progress**: Your achievements follow your wallet everywhere
- **Real-time Registration**: Players are registered automatically during onboarding
- **NFT Minting**: Mint collectible winner badges directly from game completion
- **Social Sharing**: Farcaster integration for sharing achievements
- **Verifiable Participation**: All registrations and NFTs permanently recorded on Base

## AI Agent & Automated Rewards

### Intelligent Reward Distribution System
Around the World features a sophisticated AI-powered reward distribution system that automatically manages weekly competitions and prize distribution:

#### 🤖 Gemini AI Integration
- **Smart Analysis**: Gemini AI analyzes leaderboard positions and player performance metrics
- **Dynamic Calculations**: Automatically calculates reward percentages based on ranking and score differentials
- **Fair Distribution**: Ensures equitable reward allocation across top performers
- **Real-time Monitoring**: Continuously evaluates competition dynamics and player engagement

#### 💰 Spend Permissions Architecture
- **Admin-Controlled Pool**: Administrators set weekly reward pools through secure spend permissions
- **Automated Execution**: CDP Smart Account handles reward distribution without manual intervention
- **Base Mainnet Integration**: Utilizes Base's spend permission system for seamless ETH transfers
- **Transparent Process**: All reward distributions are recorded on-chain for full transparency

#### ⚡ Automated Workflow
1. **Pool Setup**: Admin configures weekly reward pool amount via secure interface
2. **AI Analysis**: Gemini AI evaluates leaderboard data and calculates optimal reward distribution
3. **Smart Distribution**: CDP server wallet automatically distributes ETH to top players
4. **Notification System**: Players receive real-time notifications about reward distributions
5. **On-chain Records**: All transactions are permanently recorded on Base for verification

#### 🎯 Competition Features
- **Weekly Cycles**: Automated reward distribution every week based on leaderboard standings
- **Tiered Rewards**: Top 15 players receive proportional ETH rewards based on performance
- **Performance Metrics**: AI considers multiple factors including score, consistency, and engagement
- **Anti-Gaming Measures**: Smart detection prevents manipulation and ensures fair competition

## Technical Architecture

### Frontend Stack
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations and transitions

### Blockchain Integration
- **Base Mainnet**: Ethereum L2 for fast, cheap transactions
- **Viem**: TypeScript-first Ethereum library
- **Wagmi**: React hooks for Ethereum
- **OnchainKit**: Coinbase's web3 development toolkit
- **CDP SDK**: Coinbase Developer Platform for server-side wallet operations
- **Spend Permissions**: Base's native spend permission system for automated transactions

### Data Layer
- **Upstash Redis**: Real-time game state and leaderboards
- **Smart Contracts**: On-chain player registry and NFT rewards
- **Gemini AI**: Google's AI model for intelligent reward calculations
- **Hybrid Architecture**: Critical data on-chain, game state optimized for speed

### AI & Automation Stack
- **Gemini 2.0 Flash**: Advanced AI model for leaderboard analysis and reward calculations
- **CDP Smart Accounts**: Server-side wallet management for automated transactions
- **Spend Permission System**: Secure, automated ETH distribution without manual intervention
- **Real-time Notifications**: Push notifications for reward distributions and game events

## Game Instructions

### Getting Started
1. **Connect Your Wallet**: Link your Base-compatible wallet to save progress
2. **Automatic Registration**: Your wallet is registered on-chain automatically
3. **Choose Your Name**: Set a display name for leaderboards
4. **Select a Region**: Start your journey in any of the 5 cultural regions
5. **Match and Score**: Swap adjacent items to create matches of 3 or more
6. **Compete for Rewards**: Climb the leaderboards to earn weekly ETH distributions
7. **Mint NFTs**: Complete levels to unlock collectible winner badges
8. **Share Achievements**: Use Farcaster integration to celebrate wins

### Advanced Strategies
- **Special Candies**: Match 4+ items to create powerful special effects
- **Combo Chains**: Plan moves to trigger cascading reactions
- **Score Optimization**: Focus on special candy combinations for maximum points
- **Consistent Play**: Regular engagement improves AI reward calculations
- **NFT Collection**: Complete all regions to build your badge collection
- **Social Engagement**: Share scores to connect with the gaming community
- **Leaderboard Competition**: Compete weekly for ETH rewards and recognition

## 🚀 Getting Started for Developers

### Prerequisites
- Node.js 18+ and npm/yarn
- Git
- A Base-compatible wallet (MetaMask, Coinbase Wallet, etc.)

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/AroundTheWorld.git
   cd AroundTheWorld
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your API keys and configuration values in `.env`:
   - **OnchainKit API Key**: Get from [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
   - **Neynar API Key**: Get from [Neynar](https://neynar.com/) for Farcaster integration
   - **Upstash Redis**: Get free Redis from [Upstash](https://upstash.com/)
   - **Google AI API Key**: Get from [AI Studio](https://aistudio.google.com/app/apikey)
   - **CDP Wallet**: Generate via CDP SDK for automated transactions

4. **Deploy Smart Contracts (Optional)**
   ```bash
   npm run deploy
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Open in Browser**
   Navigate to `http://localhost:3000`

### Environment Variables Guide

| Variable | Description | Required | Where to Get |
|----------|-------------|----------|-------------|
| `NEXT_PUBLIC_ONCHAINKIT_API_KEY` | OnchainKit API for Base integration | ✅ | [Coinbase Developer Platform](https://portal.cdp.coinbase.com/) |
| `NEYNAR_API_KEY` | Farcaster profile data | ✅ | [Neynar](https://neynar.com/) |
| `REDIS_URL` & `REDIS_TOKEN` | Game state and leaderboards | ✅ | [Upstash](https://upstash.com/) |
| `CDP_API_KEY_ID` & `CDP_API_KEY_SECRET` | Automated wallet operations | ✅ | [CDP Portal](https://portal.cdp.coinbase.com/) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | AI reward calculations | ✅ | [AI Studio](https://aistudio.google.com/app/apikey) |
| `NFT_CONTRACT_ADDRESS` | Your deployed NFT contract | ⚠️ | Deploy contracts or use existing |
| `AUTOMATED_TRIGGER_SECRET` | Security for automated actions | ✅ | Generate secure random string |

## 🤝 Contributing

We welcome contributions from developers worldwide! Here's how you can help improve AroundTheWorld:

### Ways to Contribute

- 🐛 **Bug Reports**: Found an issue? [Open an issue](https://github.com/your-username/AroundTheWorld/issues)
- 💡 **Feature Requests**: Have ideas? [Start a discussion](https://github.com/your-username/AroundTheWorld/discussions)
- 🔧 **Code Contributions**: Submit pull requests for bug fixes or new features
- 📚 **Documentation**: Help improve our docs and guides
- 🌍 **Localization**: Add support for new languages and regions
- 🎨 **Design**: Contribute UI/UX improvements and cultural assets

### Development Guidelines

1. **Fork the repository** and create your feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Follow our coding standards**
   - Use TypeScript for type safety
   - Follow ESLint and Prettier configurations
   - Write meaningful commit messages
   - Add tests for new functionality

3. **Test your changes**
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

4. **Submit a Pull Request**
   - Provide clear description of changes
   - Reference related issues
   - Include screenshots for UI changes
   - Ensure CI passes

### Project Structure

```
AroundTheWorld/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── data/             # Game configuration
├── contracts/             # Smart contracts
├── lib/                  # Utility libraries
│   ├── cdp/              # CDP SDK integration
│   └── utils/            # Helper functions
├── public/               # Static assets
└── scripts/              # Deployment scripts
```

### Smart Contract Development

The project includes Solidity contracts for player registration and NFT rewards:

- `PlayerRegistry.sol`: On-chain player management
- `BaseappWorldExplorer.sol`: NFT reward system

Deploy contracts using:
```bash
npx hardhat run scripts/deploy.ts --network base
```

### AI Agent Integration

The reward distribution system uses Gemini AI for intelligent calculations:

- Located in `/lib/ai-agent.ts`
- Analyzes leaderboard data and player metrics
- Calculates fair reward distributions
- Integrates with CDP for automated transactions

## 🛠️ Technology Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations

### Blockchain
- **Base Mainnet**: Ethereum L2 for transactions
- **OnchainKit**: Coinbase's web3 toolkit
- **Viem & Wagmi**: Ethereum integration
- **Hardhat**: Smart contract development

### Backend Services
- **Upstash Redis**: Real-time game state
- **CDP SDK**: Automated wallet operations
- **Gemini AI**: Intelligent reward calculations
- **Vercel**: Deployment and hosting

## 📋 Roadmap

### Phase 1: Enhanced Onchain Mechanics ✅
- **NFT Achievements**: ✅ Mint unique tokens for level completions
- **Social Integration**: ✅ Farcaster sharing for community engagement
- **AI Reward System**: ✅ Automated ETH distribution via spend permissions
- **Power-up Marketplace**: Purchase special abilities with ETH
- **Tournament System**: Structured competitions with entry fees and prizes

### Phase 2: Community Features 🔮
- **Guild System**: Form teams and compete in group challenges
- **Cross-Chain Integration**: Expand to other EVM-compatible networks
- **Mobile App**: Native iOS/Android applications
- **Advanced Analytics**: Detailed performance tracking and insights

### Phase 3: Ecosystem Expansion 🚀
- **Developer API**: Third-party integrations and custom tournaments
- **Governance Token**: Community-driven development decisions
- **Metaverse Integration**: VR/AR gameplay experiences
- **Educational Content**: Learn about global cultures through gameplay

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on [Base](https://base.org/) - Ethereum's L2 for everyone
- Powered by [OnchainKit](https://onchainkit.xyz/) - Coinbase's web3 toolkit
- AI integration via [Google Gemini](https://ai.google.dev/)
- Game state management with [Upstash Redis](https://upstash.com/)
- Social features via [Farcaster](https://farcaster.xyz/)

**Built with ❤️ for the global gaming community on Base**

