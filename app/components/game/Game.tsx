"use client";

import React, { useState, useEffect } from 'react';
import { GameState, Region } from '../../utils/gameTypes';
import { levels, getLevel } from '../../utils/gameData';
import { playSound, setMute, playBackgroundMusic, stopBackgroundMusic, setMusicVolume } from '../../utils/sound';
import GameBoard from './GameBoard';
import WalletConnection from './WalletConnection';
import LevelSelection from './LevelSelection';
import Leaderboard from './Leaderboard';

// const SCHEMA_UID = "0xdc3cf7f28b4b5255ce732cbf99fe906a5bc13fbd764e2463ba6034b4e1881835";

const Game: React.FC = () => {
  // Game state
  const [gameState, setGameState] = useState<GameState>(GameState.INTRO);
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [unlockedLevels, setUnlockedLevels] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [playerAddress, setPlayerAddress] = useState<`0x${string}` | undefined>();
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [musicVolume, setMusicVolumeState] = useState<number>(0.4);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);

  // Initialize background music
  useEffect(() => {
    // Play menu music when component mounts
    playBackgroundMusic('menu');
    
    // Clean up when component unmounts
    return () => {
      stopBackgroundMusic();
    };
  }, []);

  // Handle game state changes and play appropriate music
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      // Play region-specific music when game starts
      const region = getLevel(currentLevel).region;
      playBackgroundMusic(region);
    } else if (gameState === GameState.INTRO || 
               gameState === GameState.LEVEL_COMPLETE || 
               gameState === GameState.GAME_OVER || 
               gameState === GameState.GAME_WON) {
      // Play menu music for non-gameplay states
      playBackgroundMusic('menu');
    }
  }, [gameState, currentLevel]);

  // Handle wallet connection
  const handleWalletConnect = (address: string) => {
    setPlayerAddress(address as `0x${string}`);
    playSound('transactionSuccess');
    // In a real app, we would fetch the player's progress from the blockchain here
  };

  // Handle level selection
  const handleLevelSelect = (levelIndex: number) => {
    playSound('click');
    setCurrentLevel(levelIndex);
    setGameState(GameState.PLAYING);
    setScore(0);
    
    // Play region-specific music
    const region = getLevel(levelIndex).region;
    playBackgroundMusic(region);
  };

  // Handle score updates
  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);
  };

  // Handle game state changes
  const handleGameStateChange = (newState: GameState) => {
    setGameState(newState);
    
    if (newState === GameState.LEVEL_COMPLETE) {
      playSound('levelComplete');
      // Unlock next level if this is the highest level completed
      if (currentLevel === unlockedLevels) {
        setUnlockedLevels(prev => Math.min(prev + 1, levels.length - 1));
      }
    } else if (newState === GameState.GAME_OVER) {
      playSound('gameOver');
    }
  };

  // Handle level completion
  const handleLevelComplete = () => {
    if (currentLevel < levels.length - 1) {
      // Show level complete screen first, then allow user to proceed to next level
      // The actual level transition happens in the GameBoard component's "Next Level" button
      setGameState(GameState.LEVEL_COMPLETE);
    } else {
      // Game completed
      setGameState(GameState.GAME_WON);
      playSound('win');
    }
  };

  // Toggle sound mute
  const toggleMute = () => {
    playSound('click');
    const newMuteState = !isSoundMuted;
    setIsSoundMuted(newMuteState);
    setMute(newMuteState);
  };

  // Adjust music volume
  const adjustMusicVolume = (volume: number) => {
    playSound('click');
    setMusicVolumeState(volume);
    setMusicVolume(volume);
  };

  // Toggle leaderboard visibility
  const toggleLeaderboard = () => {
    playSound('click');
    setShowLeaderboard(prev => !prev);
  };

  // Get the current level configuration
  const currentLevelConfig = getLevel(currentLevel);

  // Render the appropriate view based on game state
  const renderGameView = () => {
    switch (gameState) {
      case GameState.INTRO:
        return (
          <div className="intro-screen">
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
                  
                  <div className="flex justify-between items-center mb-3">
                    <span>Music Volume</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={musicVolume}
                      onChange={(e) => adjustMusicVolume(parseFloat(e.target.value))}
                      className="w-24"
                    />
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
                    Play without connecting a wallet. Your progress won&apos;t be saved.
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
        
      case GameState.LEVEL_COMPLETE:
        return (
          <div className="level-complete-screen p-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">Level Complete!</h1>
              <p className="text-xl mb-2">Score: {score}</p>
              <button 
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                onClick={() => {
                  playSound('click');
                  // Move to next level
                  setCurrentLevel(prev => prev + 1);
                  setGameState(GameState.PLAYING);
                  setScore(0);
                }}
              >
                Next Level
              </button>
            </div>
          </div>
        );
        
      case GameState.GAME_OVER:
        return (
          <div className="game-over-screen p-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4 text-red-600">Game Over</h1>
              <p className="text-xl mb-2">Score: {score}</p>
              <p className="text-lg mb-4">Target: {currentLevelConfig.targetScore}</p>
              <div className="flex justify-center space-x-4">
                <button 
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  onClick={() => {
                    playSound('click');
                    // Retry the current level
                    setGameState(GameState.PLAYING);
                    setScore(0);
                  }}
                >
                  Try Again
                </button>
                <button 
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  onClick={() => {
                    playSound('click');
                    // Go back to level selection
                    setGameState(GameState.INTRO);
                  }}
                >
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        );
        
      case GameState.GAME_WON:
        return (
          <div className="game-won-screen flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">Congratulations!</h1>
              <p className="text-xl mb-2">You&apos;ve completed all levels!</p>
              <p className="text-2xl font-bold mb-6">Final Score: {score}</p>
              
              {playerAddress && (
                <div className="submit-score mb-6">
                  <button 
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    onClick={() => {
                      playSound('reward');
                      // In a real implementation, this would submit the score to the blockchain
                      alert(`Score submitted: ${score} points on level ${currentLevel + 1}`);
                    }}
                  >
                    Submit Score to Leaderboard
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => {
                  playSound('click');
                  setGameState(GameState.INTRO);
                }}
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
