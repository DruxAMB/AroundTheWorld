"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { LevelSelector } from "./LevelSelector";
import { Match3Game } from "./Match3Game";
import LevelCompleteModal from "./LevelCompleteModal";
import { Level } from "../data/levels";
import { soundManager } from "../utils/soundManager";
import { useGameData } from "../hooks/useGameData";
import { useAccount } from 'wagmi';
import { LevelProgress } from '../services/gameDataService';
import { useComposeCast } from '@coinbase/onchainkit/minikit';

type GameState = 'level-select' | 'playing' | 'level-complete' | 'error';

// Define level progression order as a constant to prevent inconsistencies
const LEVEL_ORDER = ['africa-1', 'india-1', 'latam-1', 'southeast-asia-1', 'europe-1'] as const;

interface GameWrapperProps {
  onGameStateChange?: (gameState: GameState) => void;
}

export function GameWrapper({ onGameStateChange }: GameWrapperProps = {}) {
  const { progress, saveProgress: saveGameProgress, loading: gameDataLoading } = useGameData();
  const { address, isConnected } = useAccount();
  const { composeCast } = useComposeCast();

  // Share score functionality
  const handleShareScore = useCallback((level: Level, score: number, stars: number) => {
    const starEmojis = '⭐'.repeat(stars);
    const regionEmoji = {
      'Africa': '🌍',
      'India': '🇮🇳', 
      'Latin America': '🌎',
      'Southeast Asia': '🌏',
      'Europe': '🇪🇺'
    }[level.region] || '🌍';

    const shareText = `Just completed ${level.name} in Around the World! ${regionEmoji}\n\n${starEmojis} Score: ${score.toLocaleString()} points\n\nPlay the match-3 adventure across the globe, climb the leaderboad and earn rewards! 🎮`;

    try {
      composeCast({ 
        text: shareText,
        embeds: [window.location.origin]
      });
      soundManager.play('click');
    } catch (error) {
      console.error('Failed to share score:', error);
    }
  }, [composeCast]);
  
  const [gameState, setGameState] = useState<GameState>('level-select');

  // Notify parent component of game state changes
  useEffect(() => {
    onGameStateChange?.(gameState);
  }, [gameState, onGameStateChange]);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [unlockedLevels, setUnlockedLevels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Memoized function to calculate unlocked levels - prevents unnecessary recalculations
  const calculateUnlockedLevels = useCallback((progressData: LevelProgress[]): string[] => {
    
    // Always start with first level unlocked for connected users
    const unlocked = ['africa-1'];
    
    // Create a map of completed levels for faster lookup
    const completedLevels = new Set(
      progressData.filter(p => p.completed).map(p => p.levelId)
    );
    
    
    // ROBUST UNLOCKING LOGIC: Handle data inconsistencies
    // If any level is completed, unlock all levels up to and including the highest completed level
    let highestCompletedIndex = -1;
    
    // Find the highest completed level index
    for (let i = 0; i < LEVEL_ORDER.length; i++) {
      if (completedLevels.has(LEVEL_ORDER[i])) {
        highestCompletedIndex = Math.max(highestCompletedIndex, i);
      }
    }
    
    
    // Unlock all levels up to the next level after the highest completed
    if (highestCompletedIndex >= 0) {
      // Unlock all levels up to and including the next level after highest completed
      const maxUnlockIndex = Math.min(highestCompletedIndex + 1, LEVEL_ORDER.length - 1);
      
      for (let i = 0; i <= maxUnlockIndex; i++) {
        if (!unlocked.includes(LEVEL_ORDER[i])) {
          unlocked.push(LEVEL_ORDER[i]);
        }
      }
    }
    
    return unlocked;
  }, []);

  // Process progress data and determine unlocked levels with proper error handling
  useEffect(() => {
    try {
      // Clear any previous errors
      setError(null);
      
      // Only unlock levels if wallet is connected
      if (!isConnected || !address) {
        setUnlockedLevels([]); // No levels unlocked if wallet not connected
        return;
      }

      // Handle loading state
      if (gameDataLoading) {
        return; // Don't update unlocked levels while loading
      }

      // Validate progress data
      const progressArray = Array.isArray(progress) ? progress : [];
      
      // Calculate unlocked levels
      const unlocked = calculateUnlockedLevels(progressArray);
      setUnlockedLevels(unlocked);
      
    } catch (err) {
      console.error('Error calculating unlocked levels:', err);
      setError('Failed to load game progress');
      setGameState('error');
    }
  }, [progress, isConnected, address, gameDataLoading, calculateUnlockedLevels]);

  const handleLevelSelect = useCallback((level: Level) => {
    setCurrentLevel(level);
    setGameState('playing');
    
    // Play region-specific background music
    const regionMusicMap: { [key: string]: string } = {
      'Africa': 'africa',
      'India': 'india',
      'Latin America': 'latam',
      'Southeast Asia': 'southeastAsia',
      'Europe': 'europe'
    };
    
    const musicKey = regionMusicMap[level.region];
    if (musicKey && soundManager.isMusicEnabled()) {
      soundManager.fadeOutMusic(300);
      setTimeout(() => {
        soundManager.playMusic(musicKey);
      }, 400);
    }
  }, []);

  const handleLevelComplete = useCallback(async (success: boolean, score: number) => {
    if (!currentLevel) {
      console.error('Level completion called without current level');
      return;
    }

    try {
      if (success) {
        // Calculate stars based on score and objectives with validation
        let stars = 1;
        const scoreObjective = currentLevel.objectives.find(obj => obj.type === 'score');
        if (scoreObjective) {
          if (score >= scoreObjective.target * 1.5) {
            stars = 3;
          } else if (score >= scoreObjective.target * 1.2) {
            stars = 2;
          }
        }

        // Validate and update level progress
        const currentProgress = Array.isArray(progress) ? progress : [];
        const newProgress = [...currentProgress];
        const existingIndex = newProgress.findIndex(p => p.levelId === currentLevel.id);
        
        // Create progress entry with proper validation
        const progressEntry: LevelProgress = {
          levelId: currentLevel.id,
          completed: true,
          score: Math.max(score, existingIndex >= 0 ? (newProgress[existingIndex]?.score || 0) : 0),
          stars: Math.max(stars, existingIndex >= 0 ? (newProgress[existingIndex]?.stars || 0) : 0),
          bestScore: Math.max(score, existingIndex >= 0 ? (newProgress[existingIndex]?.bestScore || 0) : 0),
          completedAt: new Date().toISOString()
        };

        // Update or add progress entry
        if (existingIndex >= 0) {
          newProgress[existingIndex] = progressEntry;
        } else {
          newProgress.push(progressEntry);
        }
        
        // Save progress with error handling
        try {
          await saveGameProgress(newProgress);
        } catch (saveError) {
          console.error('Failed to save progress:', saveError);
          setError('Failed to save progress. Please try again.');
          return;
        }

        // Show completion screen with celebration
        setGameState('level-complete');
        
        // Handle audio transitions safely
        try {
          soundManager.fadeOutMusic(500);
          setTimeout(() => {
            soundManager.play('win');
          }, 600);
        } catch (audioError) {
          console.warn('Audio playback failed:', audioError);
        }
        
        // Level completion screen stays open until user manually continues
        // No automatic timeout - user controls when to return to level select
        
      } else {
        // Level failed - return to level select
        setTimeout(() => {
          setGameState('level-select');
        }, 2000);
      }
    } catch (error) {
      console.error('Error in level completion:', error);
      setError('An error occurred during level completion');
      setGameState('error');
    }
  }, [currentLevel, progress, saveGameProgress]);

  const handleBackToLevels = () => {
    setCurrentLevel(null);
    setGameState('level-select');
    setError(null);
  };

  // Helper function to get next level in progression
  const getNextLevel = useCallback((currentLevelId: string): string | null => {
    const currentIndex = LEVEL_ORDER.indexOf(currentLevelId as typeof LEVEL_ORDER[number]);
    if (currentIndex >= 0 && currentIndex < LEVEL_ORDER.length - 1) {
      return LEVEL_ORDER[currentIndex + 1];
    }
    return null;
  }, []);

  // Helper function to handle next level navigation
  const handleNextLevel = useCallback(() => {
    if (!currentLevel) return;
    
    const nextLevelId = getNextLevel(currentLevel.id);
    const isNextLevelUnlocked = nextLevelId && unlockedLevels.includes(nextLevelId);
    
    if (isNextLevelUnlocked) {
      import('../data/levels').then(({ LEVELS }) => {
        const nextLevel = LEVELS.find(l => l.id === nextLevelId);
        if (nextLevel) {
          handleLevelSelect(nextLevel);
        }
      });
    }
  }, [currentLevel, getNextLevel, unlockedLevels, handleLevelSelect]);

  // Helper function to handle retry
  const handleRetry = useCallback(() => {
    if (currentLevel) {
      handleLevelSelect(currentLevel);
    }
  }, [currentLevel, handleLevelSelect]);

  if (gameState === 'playing' && currentLevel) {
    return (
      <Match3Game
        level={currentLevel}
        onLevelComplete={handleLevelComplete}
        onBackToLevels={handleBackToLevels}
      />
    );
  }

  // Error state
  if (gameState === 'error') {
    return (
      <div className="flex flex-col h-[100vh] max-w-md mx-auto p-4 justify-center items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">
            Something went wrong
          </h2>
          <p className="text-[var(--app-foreground-muted)] mb-6">
            {error || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => {
              setError(null);
              setGameState('level-select');
            }}
            className="bg-[var(--app-accent)] text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  // Loading state
  if (gameDataLoading && isConnected) {
    return (
      <div className="flex flex-col h-[100vh] max-w-md mx-auto p-4 justify-center items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin text-4xl mb-4">🌎</div>
          <p className="text-[var(--app-foreground-muted)]">
            Loading your progress...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <LevelSelector
        onLevelSelect={handleLevelSelect}
        unlockedLevels={unlockedLevels}
        isWalletConnected={isConnected}
      />
      
      {/* Level Complete Modal with NFT Minting */}
      {gameState === 'level-complete' && currentLevel && (
        <LevelCompleteModal
          isOpen={true}
          onClose={handleBackToLevels}
          success={true}
          score={progress?.find(p => p.levelId === currentLevel.id)?.score || 0}
          levelName={currentLevel.region}
          onRetry={handleRetry}
          onNextLevel={(() => {
            const nextLevelId = getNextLevel(currentLevel.id);
            const isNextLevelUnlocked = nextLevelId && unlockedLevels.includes(nextLevelId);
            return isNextLevelUnlocked ? handleNextLevel : undefined;
          })()}
          onShare={() => {
            const currentScore = progress?.find(p => p.levelId === currentLevel.id)?.score || 0;
            const stars = Math.min(Math.floor(currentScore / 1000), 3); // Calculate stars based on score
            handleShareScore(currentLevel, currentScore, stars);
          }}
        />
      )}
    </>
  );
}
