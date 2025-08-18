# 🌍# Around the World 🌍

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

### 🏆 Competitive Features
- **Global Leaderboards**: Real-time rankings with weekly competitions
- **ETH Rewards**: Top performers earn cryptocurrency prizes
- **Player Profiles**: Comprehensive stats tracking and achievement systems
- **Social Integration**: Wallet-based identity with customizable player names

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

### Web3 Integration
- **Seamless Wallet Connection**: OnchainKit and MiniKit integration
- **Cross-Device Progress**: Your achievements follow your wallet everywhere
- **Real-time Registration**: Players are registered automatically during onboarding
- **Verifiable Participation**: All registrations are permanently recorded on Base

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

### Data Layer
- **Upstash Redis**: Real-time game state and leaderboards
- **Smart Contracts**: On-chain player registry and future features
- **Hybrid Architecture**: Critical data on-chain, game state optimized for speed

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Base-compatible wallet (Coinbase Wallet recommended)
- Redis database (Upstash recommended for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/DruxAMB/AroundTheWorld.git
   cd AroundTheWorld
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file:
   ```env
   # Redis Configuration
   UPSTASH_REDIS_REST_URL=your_redis_url
   UPSTASH_REDIS_REST_TOKEN=your_redis_token
   
   # OnchainKit Configuration
   NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key
   
   # App Metadata
   NEXT_PUBLIC_APP_NAME="Around the World"
   NEXT_PUBLIC_APP_DESCRIPTION="Match-3 puzzle adventure across global cultures"
   NEXT_PUBLIC_APP_URL="https://your-app-url.com"
   NEXT_PUBLIC_APP_ICON="https://your-app-url.com/icon.png"
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## Game Instructions

### Getting Started
1. **Connect Your Wallet**: Link your Base-compatible wallet to save progress
2. **Automatic Registration**: Your wallet is registered on-chain automatically
3. **Choose Your Name**: Set a display name for leaderboards
4. **Select a Region**: Start your journey in any of the 5 cultural regions
5. **Match and Score**: Swap adjacent items to create matches of 3 or more

### Advanced Strategies
- **Special Candies**: Match 4+ items to create powerful special effects
- **Combo Chains**: Plan moves to trigger cascading reactions
- **Score Optimization**: Focus on special candy combinations for maximum points
- **Leaderboard Competition**: Compete weekly for ETH rewards

## Roadmap

### Phase 1: Enhanced Onchain Mechanics ⏳
- **NFT Achievements**: Mint unique tokens for major milestones
- **Power-up Marketplace**: Purchase special abilities with ETH
- **Tournament System**: Structured competitions with entry fees and prizes

### Phase 2: Community Features 🔮
- **Guild System**: Team-based competitions and shared rewards
- **User-Generated Content**: Custom level creation and sharing
- **Governance Token**: Community voting on game features and updates

### Phase 3: Cross-Chain Expansion 🚀
- **Multi-Chain Support**: Expand to Ethereum, Polygon, and other networks
- **Interoperability**: Cross-chain leaderboards and asset transfers
- **DeFi Integration**: Yield farming with game tokens and rewards

## Contributing

We welcome contributions from developers, designers, and cultural consultants. Please read our contributing guidelines and code of conduct before submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Cultural consultants from each represented region
- The Base ecosystem for providing robust L2 infrastructure
- The open-source community for foundational tools and libraries
- Players worldwide who make this global gaming community possible

---

**Built with ❤️ for the global gaming community on Base**

*Submitted for Base Builder Quest 9 - Mini App Week*
