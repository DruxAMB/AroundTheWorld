"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Match3Game } from "./Match3Game";
import { LevelSelector } from "./LevelSelector";
import { Level, unlockNextLevel } from "../data/levels";
import { soundManager } from "../utils/soundManager";
import { useGameData } from "../hooks/useGameData";

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
  const { progress, saveProgress: saveGameProgress } = useGameData();
  
  const [gameState, setGameState] = useState<GameState>('level-select');
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [unlockedLevels, setUnlockedLevels] = useState<string[]>(['0']); // First level unlocked
  const [levelProgress, setLevelProgress] = useState<LevelProgress[]>([]);

  // Process progress data and determine unlocked levels
  useEffect(() => {
    if (!progress || progress.length === 0) {
      setUnlockedLevels(['0']);
      return;
    }

    // Progress is an array of LevelProgress objects
    const progressArray = Array.isArray(progress) ? progress : [];
    
    // Start with level 0 always unlocked
    const unlocked = ['0'];
    
    // Check each completed level and unlock the next one
    progressArray.forEach((levelProgress) => {
      if (levelProgress.completed) {
        // Map level completion to next level unlock
        switch (levelProgress.levelId) {
          case '0':
            if (!unlocked.includes('africa-1')) {
              unlocked.push('africa-1');
            }
            break;
          case 'africa-1':
            if (!unlocked.includes('india-1')) {
              unlocked.push('india-1');
            }
            break;
          case 'india-1':
            if (!unlocked.includes('latin-america-1')) {
              unlocked.push('latin-america-1');
            }
            break;
          case 'latin-america-1':
            if (!unlocked.includes('southeast-asia-1')) {
              unlocked.push('southeast-asia-1');
            }
            break;
          case 'southeast-asia-1':
            if (!unlocked.includes('europe-1')) {
              unlocked.push('europe-1');
            }
            break;
        }
      }
    });
    
    setUnlockedLevels(unlocked);
  }, [progress]);

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
      
      // Player stats are already updated by saveGameProgress, no need for separate API call
      console.log('✅ GameWrapper: Level completion processed, progress and stats saved via saveGameProgress');

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
