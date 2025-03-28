# Around The World - Implementation Guide

This document provides an overview of the implementation of the "Around The World" onchain Candy Crush game.

## 🎮 Game Overview

"Around The World" is a match-3 style game built on Base with the following features:
- 4 levels representing different regions with unique images
- Wallet connection using Base and Coinbase Smart Wallet
- Free-to-play mode (no wallet required)
- Power-ups and rewards
- Onchain leaderboard
- Sound effects for game interactions

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
│   │   │   └── WalletConnection.tsx # Wallet connection UI
│   ├── utils/
│   │   ├── gameData.ts            # Game data and level configurations
│   │   ├── gameEngine.ts          # Game mechanics and logic
│   │   ├── gameTypes.ts           # TypeScript interfaces and types
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
```

## 🔧 Implementation Details

### Game Engine

The game engine in `app/utils/gameEngine.ts` handles the core game mechanics:
- Creating and managing the game grid
- Detecting and processing matches
- Handling power-ups
- Refilling the grid after matches
- Checking for possible moves

### Game Components

1. **Game.tsx**: The main game component that manages game state and renders different screens based on the current state.

2. **GameBoard.tsx**: Renders the game grid and handles user interactions like selecting and swapping cells.

3. **PowerUps.tsx**: Displays available power-ups and allows players to use them.

4. **LevelSelection.tsx**: Shows available levels and allows players to select a region to play.

5. **Leaderboard.tsx**: Displays the onchain leaderboard with top scores.

6. **WalletConnection.tsx**: Handles wallet connection using Coinbase Smart Wallet.

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
4. Match 4 or more items to create power-ups.
5. Reach the target score before the time runs out to complete the level.
6. Complete all 4 levels to finish the game.

## 🔄 Onchain Integration

The game integrates with Base blockchain for:
- Wallet connection using Coinbase Smart Wallet
- Storing scores on the blockchain using attestations
- Displaying an onchain leaderboard

## 🎵 Sound Effects

Sound effects are implemented using Howler.js:
- Slashing sounds when swapping items
- Match sounds when items are matched
- Win sounds when completing a level
- Power-up sounds when using special abilities
