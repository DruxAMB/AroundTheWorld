"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Match3Game } from "./Match3Game";
import { LevelSelector } from "./LevelSelector";
import { Level, unlockNextLevel } from "../data/levels";
import { soundManager } from "../utils/soundManager";
import { useGameData } from "../hooks/useGameData";
import { useAccount } from 'wagmi';

type GameState = 'level-select' | 'playing' | 'level-complete';

interface LevelProgress {
  levelId: string;
  completed: boolean;
  score: number;
  stars: number;
  bestScore: number;
  completedAt?: string;
}

export function GameWrapper() {
  const { address, isConnected } = useAccount();
  const { player, progress, saveProgress: saveGameProgress } = useGameData();
  
  const [gameState, setGameState] = useState<GameState>('level-select');
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [unlockedLevels, setUnlockedLevels] = useState<string[]>(['africa-1']); // First level unlocked
  const [levelProgress, setLevelProgress] = useState<LevelProgress[]>([]);

  // Load progress from Redis via useGameData hook and start menu music
  useEffect(() => {
    if (progress && Object.keys(progress).length > 0) {
      // Convert Redis progress format to local format
      const progressArray: LevelProgress[] = Object.entries(progress).map(([levelId, levelData]: [string, any]) => ({
        levelId,
        completed: levelData.completed,
        score: levelData.bestScore,
        stars: levelData.stars,
        bestScore: levelData.bestScore,
        completedAt: levelData.completedAt
      }));
      
      setLevelProgress(progressArray);
      
      // Set unlocked levels based on completed levels
      const unlocked = ['africa-1']; // Always unlock first level
      progressArray.forEach(p => {
        if (p.completed) {
          const nextLevel = unlockNextLevel(p.levelId);
          if (nextLevel && !unlocked.includes(nextLevel)) {
            unlocked.push(nextLevel);
          }
        }
      });
      setUnlockedLevels(unlocked);
    }

    // Start menu music when component loads
    setTimeout(() => {
      soundManager.playMusic('menu');
    }, 1000);
  }, [progress]);

  // Save progress to Redis instead of localStorage
  const saveProgressToRedis = async () => {
    if (!levelProgress || levelProgress.length === 0) return;
    
    try {
      // Convert local progress format to the expected LevelProgress[] format
      await saveGameProgress(levelProgress);
    } catch (error) {
      console.error('Failed to save progress to Redis:', error);
    }
  };

  const handleLevelSelect = (level: Level) => {
    setCurrentLevel(level);
    setGameState('playing');
    // Start level-specific background music
    soundManager.fadeOutMusic(500);
    setTimeout(() => {
      soundManager.playMusic(level.backgroundMusic);
    }, 600);
  };

  const handleLevelComplete = async (success: boolean, score: number) => {
    if (!currentLevel) return;

    if (success) {
      // Calculate stars based on score and objectives
      let stars = 1;
      const scoreObjective = currentLevel.objectives.find(obj => obj.type === 'score');
      if (scoreObjective && score >= scoreObjective.target * 1.5) {
        stars = 3;
      } else if (scoreObjective && score >= scoreObjective.target * 1.2) {
        stars = 2;
      }

      // Update level progress
      const newProgress = [...levelProgress];
      const existingIndex = newProgress.findIndex(p => p.levelId === currentLevel.id);
      
      const progressEntry: LevelProgress = {
        levelId: currentLevel.id,
        completed: true,
        score: Math.max(score, existingIndex >= 0 ? newProgress[existingIndex].score : 0),
        stars: Math.max(stars, existingIndex >= 0 ? newProgress[existingIndex].stars : 0),
        bestScore: Math.max(score, existingIndex >= 0 ? newProgress[existingIndex].bestScore : 0),
        completedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        newProgress[existingIndex] = progressEntry;
      } else {
        newProgress.push(progressEntry);
      }

      // Unlock next level
      const nextLevelId = unlockNextLevel(currentLevel.id);
      const newUnlocked = [...unlockedLevels];
      if (nextLevelId && !newUnlocked.includes(nextLevelId)) {
        newUnlocked.push(nextLevelId);
      }

      setLevelProgress(newProgress);
      setUnlockedLevels(newUnlocked);
      
      // Save progress to Redis
      await saveGameProgress(newProgress);
      
      // Update player's total score and level completion stats in Redis
      if (isConnected && address && player) {
        try {
          const totalScore = newProgress.reduce((sum, p) => sum + p.score, 0);
          const levelsCompleted = newProgress.filter(p => p.completed).length;
          const bestLevel = Math.max(...newProgress.map(p => parseInt(p.levelId.split('-')[1]) || 1));
          
          // Update player profile with new stats
          const response = await fetch('/api/player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: address,
              playerData: {
                totalScore,
                levelsCompleted,
                bestLevel
              }
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to update player stats');
          }
        } catch (error) {
          console.error('Failed to update player stats in Redis:', error);
        }
      }

      // Show completion screen briefly with celebration music
      setGameState('level-complete');
      soundManager.fadeOutMusic(500);
      setTimeout(() => {
        soundManager.play('win');
      }, 600);
      
      setTimeout(() => {
        setGameState('level-select');
        soundManager.playMusic('menu');
      }, 3000);
    } else {
      // Failed - go back to level select after a delay
      setTimeout(() => {
        setGameState('level-select');
      }, 2000);
    }
  };

  const handleBackToLevels = () => {
    setGameState('level-select');
    setCurrentLevel(null);
    // Switch back to menu music
    soundManager.fadeOutMusic(500);
    setTimeout(() => {
      soundManager.playMusic('menu');
    }, 600);
  };

  const getLevelStars = (levelId: string): number => {
    const progress = levelProgress.find(p => p.levelId === levelId);
    return progress?.stars || 0;
  };

  const getLevelScore = (levelId: string): number => {
    const progress = levelProgress.find(p => p.levelId === levelId);
    return progress?.score || 0;
  };



  if (gameState === 'level-complete' && currentLevel) {
    const progress = levelProgress.find(p => p.levelId === currentLevel.id);
    const stars = progress?.stars || 1;
    
    return (
      <div className="flex flex-col h-full max-w-md mx-auto p-4 justify-center items-center space-y-6">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-[var(--app-foreground)] mb-2">
            Level Complete!
          </h2>
          <p className="text-[var(--app-foreground-muted)] mb-4">
            {currentLevel.name} - {currentLevel.region}
          </p>
          
          {/* Stars */}
          <div className="flex justify-center space-x-2 mb-4">
            {[1, 2, 3].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: star * 0.2, type: "spring" }}
                className="text-3xl"
              >
                {star <= stars ? '⭐' : '☆'}
              </motion.div>
            ))}
          </div>
          
          <div className="text-lg font-bold text-[var(--app-accent)]">
            Score: {progress?.score || 0}
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center"
        >
          <p className="text-sm text-[var(--app-foreground-muted)]">
            Returning to level select...
          </p>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'playing' && currentLevel) {
    return (
      <Match3Game
        level={currentLevel}
        onLevelComplete={handleLevelComplete}
        onBackToLevels={handleBackToLevels}
      />
    );
  }

  return (
    <LevelSelector
      onLevelSelect={handleLevelSelect}
      unlockedLevels={unlockedLevels}
    />
  );
}
