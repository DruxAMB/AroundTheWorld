"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Match3Game } from "./Match3Game";
import { LevelSelector } from "./LevelSelector";
import { Level, unlockNextLevel } from "../data/levels";
import { soundManager } from "../utils/soundManager";

type GameState = 'level-select' | 'playing' | 'level-complete';

interface LevelProgress {
  levelId: string;
  completed: boolean;
  score: number;
  stars: number;
}

export function GameWrapper() {
  const [gameState, setGameState] = useState<GameState>('level-select');
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [unlockedLevels, setUnlockedLevels] = useState<string[]>(['africa-1']); // First level unlocked
  const [levelProgress, setLevelProgress] = useState<LevelProgress[]>([]);

  // Load progress from localStorage on mount and start menu music
  useEffect(() => {
    const savedProgress = localStorage.getItem('match3-progress');
    const savedUnlocked = localStorage.getItem('match3-unlocked');
    
    if (savedProgress) {
      try {
        setLevelProgress(JSON.parse(savedProgress));
      } catch (e) {
        console.warn('Failed to load level progress');
      }
    }
    
    if (savedUnlocked) {
      try {
        setUnlockedLevels(JSON.parse(savedUnlocked));
      } catch (e) {
        console.warn('Failed to load unlocked levels');
      }
    }

    // Start menu music when component loads
    setTimeout(() => {
      soundManager.playMusic('menu');
    }, 1000);
  }, []);

  // Save progress to localStorage
  const saveProgress = (progress: LevelProgress[], unlocked: string[]) => {
    localStorage.setItem('match3-progress', JSON.stringify(progress));
    localStorage.setItem('match3-unlocked', JSON.stringify(unlocked));
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

  const handleLevelComplete = (success: boolean, score: number) => {
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
      saveProgress(newProgress, newUnlocked);

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
