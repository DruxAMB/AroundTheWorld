"use client";

import React, { useState, useEffect } from 'react';
import { GameState, Region } from '../../utils/gameTypes';
import { levels, getLevel } from '../../utils/gameData';
import { playSound, setMute } from '../../utils/sound';
import GameBoard from './GameBoard';
import WalletConnection from './WalletConnection';
import LevelSelection from './LevelSelection';
import Leaderboard from './Leaderboard';
import PowerUps from './PowerUps';
import { useAccount } from "wagmi";

const SCHEMA_UID = "0xdc3cf7f28b4b5255ce732cbf99fe906a5bc13fbd764e2463ba6034b4e1881835";

const Game: React.FC = () => {
  // Game state
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [unlockedLevels, setUnlockedLevels] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [playerAddress, setPlayerAddress] = useState<`0x${string}` | undefined>();
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);

  // Handle wallet connection
  const handleWalletConnect = (address: string) => {
    setPlayerAddress(address as `0x${string}`);
    // In a real app, we would fetch the player's progress from the blockchain here
  };

  // Handle level selection
  const handleLevelSelect = (levelIndex: number) => {
    setCurrentLevel(levelIndex);
    setGameState(GameState.PLAYING);
    setScore(0);
    playSound('slash');
  };

  // Handle score updates
  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);
  };

  // Handle game state changes
  const handleGameStateChange = (newState: GameState) => {
    setGameState(newState);
    
    if (newState === GameState.LEVEL_COMPLETE) {
      playSound('win');
      // Unlock next level if this is the highest level completed
      if (currentLevel === unlockedLevels) {
        setUnlockedLevels(prev => Math.min(prev + 1, levels.length - 1));
      }
    }
  };

  // Handle level completion
  const handleLevelComplete = () => {
    if (currentLevel < levels.length - 1) {
      // Move to next level
      setCurrentLevel(prev => prev + 1);
      setGameState(GameState.PLAYING);
      setScore(0);
    } else {
      // Game completed
      setGameState(GameState.GAME_WON);
      playSound('win');
    }
  };

  // Toggle sound mute
  const toggleMute = () => {
    const newMuteState = !isSoundMuted;
    setIsSoundMuted(newMuteState);
    setMute(newMuteState);
  };

  // Toggle leaderboard visibility
  const toggleLeaderboard = () => {
    setShowLeaderboard(prev => !prev);
  };

  // Get the current level configuration
  const currentLevelConfig = getLevel(currentLevel);

  // Render the appropriate view based on game state
  const renderGameView = () => {
    switch (gameState) {
      case GameState.INTRO:
        return (
          <div className="intro-screen p-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Around The World</h1>
              <p className="text-lg text-gray-600">Match & Slash Game on Base</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <WalletConnection onConnect={handleWalletConnect} />
                
                <div className="game-options p-4 bg-white rounded-lg shadow-md mb-4">
                  <h2 className="text-xl font-bold mb-4">Game Options</h2>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span>Sound</span>
                    <button 
                      onClick={toggleMute}
                      className="p-2 rounded-full hover:bg-gray-100"
                    >
                      {isSoundMuted ? '🔇' : '🔊'}
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Leaderboard</span>
                    <button 
                      onClick={toggleLeaderboard}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 text-sm"
                    >
                      {showLeaderboard ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                
                <div className="free-play-option p-4 bg-white rounded-lg shadow-md">
                  <h2 className="text-xl font-bold mb-2">Free-to-Play Mode</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Play without connecting a wallet. Your progress won't be saved.
                  </p>
                  <button 
                    onClick={() => handleLevelSelect(0)}
                    className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Start Free Play
                  </button>
                </div>
              </div>
              
              <div className="col-span-1">
                {showLeaderboard ? (
                  <Leaderboard playerAddress={playerAddress} />
                ) : (
                  <LevelSelection 
                    onSelectLevel={handleLevelSelect}
                    currentLevel={currentLevel}
                    unlockedLevels={unlockedLevels}
                  />
                )}
              </div>
            </div>
          </div>
        );
        
      case GameState.PLAYING:
        return (
          <div className="game-screen p-4">
            <div className="game-header flex justify-between items-center mb-4">
              <button 
                onClick={() => setGameState(GameState.INTRO)}
                className="back-button px-3 py-1 bg-gray-200 rounded-full hover:bg-gray-300 text-sm flex items-center"
              >
                <span className="mr-1">←</span>
                <span>Back</span>
              </button>
              
              <h1 className="text-xl font-bold">
                {getRegionName(currentLevelConfig.region)} - Level {currentLevel + 1}
              </h1>
              
              <button 
                onClick={toggleMute}
                className="sound-button p-2 rounded-full hover:bg-gray-100"
              >
                {isSoundMuted ? '🔇' : '🔊'}
              </button>
            </div>
            
            <GameBoard 
              level={currentLevel}
              items={currentLevelConfig.items}
              rows={currentLevelConfig.gridSize.rows}
              cols={currentLevelConfig.gridSize.cols}
              onScoreUpdate={handleScoreUpdate}
              onGameStateChange={handleGameStateChange}
              onLevelComplete={handleLevelComplete}
              targetScore={currentLevelConfig.targetScore}
              timeLimit={currentLevelConfig.timeLimit}
            />
          </div>
        );
        
      case GameState.GAME_WON:
        return (
          <div className="game-won-screen flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">Congratulations!</h1>
              <p className="text-xl mb-2">You've completed all levels!</p>
              <p className="text-2xl font-bold mb-6">Final Score: {score}</p>
              
              {playerAddress && (
                <div className="submit-score mb-6">
                  <button 
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    onClick={() => {
                      // In a real implementation, this would submit the score to the blockchain
                      alert(`Score submitted: ${score} points on level ${currentLevel + 1}`);
                    }}
                  >
                    Submit Score to Leaderboard
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => setGameState(GameState.INTRO)}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Back to Home
              </button>
            </div>
            
            <Leaderboard playerAddress={playerAddress} />
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="game-container max-w-4xl mx-auto">
      {renderGameView()}
    </div>
  );
};

// Helper function to get a formatted region name
const getRegionName = (region: Region): string => {
  switch (region) {
    case Region.LATAM:
      return 'Latin America';
    case Region.AFRICA:
      return 'Africa';
    case Region.SOUTHEAST_ASIA:
      return 'Southeast Asia';
    case Region.INDIA:
      return 'India';
    default:
      return '';
  }
};

export default Game;
