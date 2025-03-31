# Around The World - Implementation Guide

This document provides an overview of the implementation of the "Around The World" onchain Candy Crush game.

## 🎮 Game Overview

"Around The World" is a match-3 style game built on Base with the following features:
- 4 levels representing different regions (Africa, India, Latin America, Southeast Asia) with unique themed images
- Wallet connection using Base and Coinbase Smart Wallet
- Free-to-play mode (no wallet required)
- Power-ups and rewards
- Onchain leaderboard with persistent scores
- NFT rewards minted through Zora SDK
- Sound effects for game interactions
- Responsive design for desktop and mobile play

## 📁 Project Structure

```
around-the-world/
├── app/
│   ├── components/
│   │   ├── game/
│   │   │   ├── Game.tsx           # Main game component
│   │   │   ├── GameBoard.tsx      # Game board with grid and interactions
│   │   │   ├── Leaderboard.tsx    # Onchain leaderboard
│   │   │   ├── LevelSelection.tsx # Level selection screen
│   │   │   ├── PowerUps.tsx       # Power-ups component
│   │   │   ├── NFTRewards.tsx     # NFT rewards component using Zora
│   │   │   └── WalletConnection.tsx # Wallet connection UI
│   ├── utils/
│   │   ├── gameData.ts            # Game data and level configurations
│   │   ├── gameEngine.ts          # Game mechanics and logic
│   │   ├── gameTypes.ts           # TypeScript interfaces and types
│   │   ├── zoraNFT.ts             # Zora SDK integration for NFT minting
│   │   └── sound.ts               # Sound effects utility
│   ├── page.tsx                   # Main app page
│   └── ...
├── public/
│   ├── africa/                    # Africa region images
│   ├── india/                     # India region images
│   ├── latam/                     # Latin America region images
│   ├── southeast-asia/            # Southeast Asia region images
│   └── sounds/                    # Sound effect files
└── ...

## 🔧 Implementation Details

### Game Engine

The game engine in `app/utils/gameEngine.ts` handles the core game mechanics:
- Creating and managing the game grid
- Detecting and processing matches
- Handling power-ups and special items
- Refilling the grid after matches
- Checking for possible moves
- Score calculation and level progression

### Game Components

1. **Game.tsx**: The main game component that manages game state and renders different screens based on the current state.

2. **GameBoard.tsx**: Renders the game grid and handles user interactions like selecting and swapping cells.

3. **PowerUps.tsx**: Displays available power-ups and allows players to use them during gameplay.

4. **LevelSelection.tsx**: Shows available levels and allows players to select a region to play.

5. **Leaderboard.tsx**: Displays the onchain leaderboard with top scores from all players.

6. **WalletConnection.tsx**: Handles wallet connection using Coinbase Smart Wallet for onchain features.

7. **NFTRewards.tsx**: Manages the NFT rewards system using Zora SDK for minting achievement NFTs.

### Sound Effects

Sound effects are implemented using Howler.js in `app/utils/sound.ts`:
- `match.mp3`: Played when a match is made
- `slash.mp3`: Played when items are swapped
- `win.mp3`: Played when a level is completed
- `levelComplete.mp3`: Played when transitioning to the next level
- `powerUp.mp3`: Played when a power-up is used

## 🚀 Running the Game

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎮 How to Play

1. Connect your wallet (optional) or use free-to-play mode.
2. Select a region/level to play.
3. Match 3 or more identical items by swapping adjacent cells.
4. Match 4 or more items to create power-ups:
   - Match 4 in a row/column: Creates a line-clearing power-up
   - Match 5 in an L-shape: Creates a special area-clearing power-up
   - Match 5 in a row/column: Creates a color-clearing power-up
5. Reach the target score before the time runs out to complete the level.
6. Complete all 4 levels to finish the game.

## 🔄 Onchain Integration

The game integrates with Base blockchain for:
- Wallet connection using Coinbase Smart Wallet
- Storing scores on the blockchain using attestations
- Displaying an onchain leaderboard with persistent player rankings
- NFT rewards for achievements and level completion using Zora SDK
- Future potential for additional tokenized achievements

### Technical Implementation
- Uses Base's attestation framework for score verification
- Implements EIP-1193 for wallet connections
- Integrates Zora SDK for gasless NFT minting on Base
- Securely manages user authentication and score submission

## 🏆 NFT Rewards

Players can earn unique NFTs through gameplay:
- Level completion NFTs with unique artwork for each region
- Achievement NFTs for special in-game accomplishments
- Leaderboard position NFTs for top players
- All NFTs are minted using Zora SDK on Base
- Gasless minting experience for seamless user experience

## 🪙 Custom Game Tokens with Zora Coins SDK

Players who complete all levels can create their own ERC20 tokens:
- Create personalized "Around The World Token" (ATW) using Zora Coins SDK
- Tokens are minted directly to the player's connected wallet
- Custom token parameters including name, symbol, and metadata
- Tokens can be used for future game features and trading
- Implementation uses @zoralabs/coins-sdk for seamless token creation

```tsx
// Example of Zora Coins SDK integration
const coinParams = {
  name: "Around The World Token",
  symbol: "ATW",
  uri: "ipfs://bafybeigoxzqzbnxsn35vq7lls3ljxdcwjafxvbvkivprsodzrptpiguysy",
  payoutRecipient: playerAddress as Address,
  platformReferrer: "0x434d6c335a1739f6d18362Dd13B282930aBbdCDe" as Address,
};

// Create configuration for wagmi
const contractCallParams = createCoinCall(coinParams);
```

## 🎵 Sound Effects

Sound effects enhance the gaming experience:
- Slashing sounds when swapping items
- Match sounds when items are matched
- Win sounds when completing a level
- Power-up sounds when using special abilities
- Background music that changes with each region

## 🛠️ Technologies Used

- Next.js for the frontend framework
- TypeScript for type safety
- Tailwind CSS for styling
- Howler.js for sound management
- Base blockchain for onchain integration
- Coinbase Smart Wallet for wallet connections
- Zora SDK for NFT minting and management

## 📱 Responsive Design

The game is designed to work on various devices:
- Desktop: Full-screen experience with keyboard controls
- Tablet: Touch-optimized interface
- Mobile: Compact layout with touch controls

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
