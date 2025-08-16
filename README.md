# 🌍 Around the World - Match-3 Adventure Game

A captivating match-3 puzzle game that takes players on a journey across five unique regions of the world. Built with modern web technologies and blockchain integration for persistent player progress and competitive leaderboards.

## 🎮 Game Overview

**Around the World** is a Candy Crush-style match-3 game featuring:
- **5 Themed Levels**: Africa, India, Latin America, Southeast Asia, and Europe
- **Regional Soundtracks**: Authentic music for each destination
- **Progressive Difficulty**: Unlock levels by completing previous regions
- **Competitive Leaderboards**: Weekly, monthly, and all-time rankings
- **Persistent Progress**: Cross-device sync via Redis backend
- **Special Candies**: Striped, wrapped, and combo effects
- **Chain Reactions**: Cascading matches for higher scores

## 🛠️ Technology Stack

- **Frontend**: [Next.js](https://nextjs.org) + [React](https://reactjs.org) + [TypeScript](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) + Custom CSS variables
- **Animations**: [Framer Motion](https://www.framer.com/motion)
- **Blockchain**: [MiniKit](https://docs.base.org/builderkits/minikit/overview) + [OnchainKit](https://www.base.org/builders/onchainkit)
- **Backend**: [Redis](https://redis.io) (Upstash) for data persistence
- **Audio**: Custom sound manager with regional music

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm
- Redis database (Upstash recommended)
- Coinbase Wallet for blockchain features

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/DruxAMB/AroundTheWorld.git
cd AroundTheWorld
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables:**

Create a `.env.local` file with the following variables:

```bash
# Redis Configuration (Required for game data persistence)
REDIS_URL=your_upstash_redis_url
REDIS_TOKEN=your_upstash_redis_token

# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME="Around the World"
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_coinbase_api_key

# App Metadata
NEXT_PUBLIC_APP_ICON=/icon.png
NEXT_PUBLIC_APP_SUBTITLE="Match-3 Adventure Game"
NEXT_PUBLIC_APP_DESCRIPTION="Journey around the world in this captivating match-3 puzzle game"
NEXT_PUBLIC_APP_TAGLINE="Match, Travel, Conquer!"
```

> **Note**: Redis is essential for the game to function properly. Sign up at [Upstash](https://upstash.com) for a free Redis database.

4. **Start the development server:**
```bash
npm run dev
```

5. **Open your browser:**
Navigate to [http://localhost:3000](http://localhost:3000) to start playing!

## 🎯 How to Play

See [HOW_TO_PLAY.md](./HOW_TO_PLAY.md) for detailed gameplay instructions and strategies.

## 🏗️ Project Structure

```
app/
├── components/          # React components
│   ├── GameWrapper.tsx     # Main game container
│   ├── Match3Game.tsx      # Core game logic
│   ├── LevelSelector.tsx   # Level selection UI
│   ├── Leaderboard.tsx     # Competitive rankings
│   ├── SettingsModal.tsx   # Audio/visual settings
│   └── UserProfile.tsx     # Player profile management
├── hooks/               # Custom React hooks
│   └── useGameData.ts      # Game state management
├── services/            # Backend services
│   └── gameDataService.ts  # Redis data operations
├── utils/               # Utility functions
│   └── soundManager.ts     # Audio management
├── api/                 # API routes
│   ├── player/             # Player data endpoints
│   └── leaderboard/        # Leaderboard endpoints
└── data/                # Game configuration
    └── levels.ts           # Level definitions
```

## 🎨 Game Features

### 🌍 Regional Levels
- **Africa**: Tropical fruits and safari themes
- **India**: Spices and vibrant colors
- **Latin America**: Festive celebrations and flavors
- **Southeast Asia**: Exotic fruits and paradise vibes
- **Europe**: Elegant gardens and classical elements

### 🎵 Audio System
- Regional background music for each level
- Sound effects for matches, combos, and special actions
- Volume controls for music and sound effects
- Mute/unmute functionality

### 🏆 Competitive Features
- **Weekly Leaderboards**: Reset every Monday (ISO 8601)
- **Monthly Leaderboards**: Monthly competition cycles
- **All-Time Rankings**: Permanent hall of fame
- **Player Profiles**: Track progress and achievements
- **Cross-Device Sync**: Play anywhere with wallet connection

### 🎮 Game Mechanics
- **Match-3 Core**: Classic swap-and-match gameplay
- **Special Candies**: Striped, wrapped, and combination effects
- **Chain Reactions**: Cascading matches for bonus points
- **Progressive Unlocking**: Complete levels to access new regions
- **Objective-Based**: Score targets and move limits
- **Auto-Reshuffle**: Prevents unwinnable board states

### 🔧 Technical Features
- **Persistent Data**: Redis-backed player progress
- **Wallet Integration**: Coinbase Wallet connectivity
- **Responsive Design**: Works on desktop and mobile
- **Smooth Animations**: Framer Motion powered effects
- **Theme Support**: Light/dark mode compatibility
- **Type Safety**: Full TypeScript implementation

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [MiniKit](https://docs.base.org/builderkits/minikit/overview) and [OnchainKit](https://www.base.org/builders/onchainkit)
- Regional music sourced from authentic cultural compositions
- Game assets designed for cultural authenticity and respect
- Special thanks to the Base ecosystem for blockchain infrastructure

## 📞 Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Join our community discussions
- Check the [HOW_TO_PLAY.md](./HOW_TO_PLAY.md) guide

---

**Ready to embark on your around-the-world adventure? Start matching and exploring! 🌍✨**

## Technical Implementation

### MiniKit Provider
The app is wrapped with `MiniKitProvider` in `providers.tsx`, configured with:
- OnchainKit integration
- Access to Frames context
- Sets up Wagmi Connectors
- Sets up Frame SDK listeners
- Applies Safe Area Insets

## Customization

To get started building your own frame, follow these steps:

1. Remove the DemoComponents:
   - Delete `components/DemoComponents.tsx`
   - Remove demo-related imports from `page.tsx`

2. Start building your Frame:
   - Modify `page.tsx` to create your Frame UI
   - Update theme variables in `theme.css`
   - Adjust MiniKit configuration in `providers.tsx`

3. Add your frame to your account:
   - Cast your frame to see it in action
   - Share your frame with others to start building your community

## Learn More

- [MiniKit Documentation](https://docs.base.org/builderkits/minikit/overview)
- [OnchainKit Documentation](https://docs.base.org/builderkits/onchainkit/getting-started)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
