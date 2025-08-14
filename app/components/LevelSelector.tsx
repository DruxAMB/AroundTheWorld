"use client";

import { motion } from "framer-motion";
import { Level, LEVELS } from "../data/levels";

interface LevelSelectorProps {
  onLevelSelect: (level: Level) => void;
  unlockedLevels: string[];
  isWalletConnected: boolean;
}

export function LevelSelector({ onLevelSelect, unlockedLevels, isWalletConnected }: LevelSelectorProps) {
  const isLevelUnlocked = (levelId: string) => {
    return unlockedLevels.includes(levelId);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'hard': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getDifficultyStars = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '⭐';
      case 'medium': return '⭐⭐';
      case 'hard': return '⭐⭐⭐';
      default: return '⭐';
    }
  };

  return (
    <div className="no-scrollbar flex flex-col h-full max-w-md mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[var(--app-foreground)] mb-2">
          🌍 Around the World
        </h1>
        <p className="text-sm text-[var(--app-foreground-muted)]">
          Choose your destination and start matching!
        </p>
      </div>

      {/* Level Grid */}
      <div className="no-scrollbar flex-1 overflow-y-auto">
        <div className="space-y-3">
          {LEVELS.map((level, index) => {
            const unlocked = isLevelUnlocked(level.id);
            
            return (
              <motion.div
                key={level.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative overflow-hidden rounded-xl border-2 ${
                  unlocked 
                    ? 'border-[var(--app-accent)] cursor-pointer hover:shadow-lg' 
                    : 'border-gray-400 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => unlocked && onLevelSelect(level)}
                whileHover={unlocked ? { scale: 1.02, borderColor: 'none' } : {}}
                whileTap={unlocked ? { scale: 0.98, borderColor: 'none' } : {}}
              >
                {/* Background Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30"
                  style={{ 
                    backgroundImage: `url(${level.backgroundImage})`,
                  }}
                />
                
                {/* Content */}
                <div className="relative bg-[var(--app-card-bg)] bg-opacity-90 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">
                        {index === 0 ? '🌍' : 
                         index === 1 ? '🇮🇳' : 
                         index === 2 ? '🌮' : 
                         index === 3 ? '🏝️' : '🏰'}
                      </span>
                      <div>
                        <h3 className="font-bold text-[var(--app-foreground)]">
                          {level.name}
                        </h3>
                        <p className="text-xs text-[var(--app-foreground-muted)]">
                          {level.region}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-xs font-medium ${getDifficultyColor(level.difficulty)}`}>
                        {getDifficultyStars(level.difficulty)}
                      </div>
                      <div className="text-xs text-[var(--app-foreground-muted)]">
                        {level.moves} moves
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-[var(--app-foreground-muted)] mb-3">
                    {level.description}
                  </p>
                  
                  {/* Objectives */}
                  <div className="space-y-1">
                    {level.objectives.map((objective, objIndex) => (
                      <div key={objIndex} className="flex items-center space-x-2">
                        <span className="text-xs">🎯</span>
                        <span className="text-xs text-[var(--app-foreground-muted)]">
                          {objective.description}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Candy Preview */}
                  <div className="flex justify-center space-x-1 mt-3">
                    {level.candyTheme.slice(0, 4).map((candy, candyIndex) => (
                      <span key={candyIndex} className="text-lg">
                        {candy}
                      </span>
                    ))}
                    <span className="text-sm text-[var(--app-foreground-muted)]">...</span>
                  </div>
                  
                  {/* Lock Overlay */}
                  {!unlocked && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl mb-2">
                          {!isWalletConnected ? '🔐' : '🔒'}
                        </div>
                        <div className="text-sm text-white font-medium">
                          {!isWalletConnected ? 'Sign in to get started' : 'Complete previous level'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center">
        <p className="text-xs text-[var(--app-foreground-muted)]">
          Complete levels to unlock new destinations!
        </p>
      </div>
    </div>
  );
}
