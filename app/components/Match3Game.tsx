"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundManager } from "../utils/soundManager";

// Game configuration
const GRID_SIZE = 6;
const CANDY_TYPES = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒'];
const SPECIAL_CANDIES = {
  STRIPED_H: '🟦', // Horizontal striped
  STRIPED_V: '🟨', // Vertical striped
  WRAPPED: '🟪',   // Wrapped candy
  COLOR_BOMB: '⚫'  // Color bomb
};

type CandyType = string;
type Position = { row: number; col: number };
type GameGrid = CandyType[][];
type AnimationType = 'drop' | 'match' | 'special' | 'spawn' | null;
type CandyState = {
  type: CandyType;
  animation: AnimationType;
  isMatched: boolean;
  id: string;
};

interface GameState {
  grid: GameGrid;
  score: number;
  moves: number;
  selectedCandy: Position | null;
  animating: boolean;
  matchedCandies: Position[];
  candyIds: string[][];
  soundEnabled: boolean;
}

// Generate random candy
const getRandomCandy = (): CandyType => {
  return CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];
};

// Create initial grid with unique IDs
const createInitialGrid = (): { grid: GameGrid; ids: string[][] } => {
  const grid: GameGrid = [];
  const ids: string[][] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row] = [];
    ids[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      grid[row][col] = getRandomCandy();
      ids[row][col] = `${row}-${col}-${Date.now()}-${Math.random()}`;
    }
  }
  return { grid, ids };
};

// Check if two positions are adjacent
const areAdjacent = (pos1: Position, pos2: Position): boolean => {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

// Check if candy is special
const isSpecialCandy = (candy: CandyType): boolean => {
  return Object.values(SPECIAL_CANDIES).includes(candy);
};

// Create special candy based on match size and pattern
const createSpecialCandy = (matchSize: number, isHorizontal: boolean): CandyType => {
  if (matchSize === 4) {
    return isHorizontal ? SPECIAL_CANDIES.STRIPED_H : SPECIAL_CANDIES.STRIPED_V;
  } else if (matchSize === 5) {
    return SPECIAL_CANDIES.COLOR_BOMB;
  } else if (matchSize >= 6) {
    return SPECIAL_CANDIES.WRAPPED;
  }
  return getRandomCandy();
};

// Find matches in the grid with special candy detection
const findMatches = (grid: GameGrid): { matches: Position[]; specialCandies: { pos: Position; type: CandyType }[] } => {
  const matches: Position[] = [];
  const specialCandies: { pos: Position; type: CandyType }[] = [];
  
  // Check horizontal matches
  for (let row = 0; row < GRID_SIZE; row++) {
    let matchStart = 0;
    for (let col = 1; col <= GRID_SIZE; col++) {
      if (col === GRID_SIZE || grid[row][col] !== grid[row][matchStart]) {
        const matchLength = col - matchStart;
        if (matchLength >= 3) {
          // Add matches
          for (let i = matchStart; i < col; i++) {
            matches.push({ row, col: i });
          }
          // Create special candy if match is 4+
          if (matchLength >= 4) {
            const specialPos = { row, col: matchStart + Math.floor(matchLength / 2) };
            specialCandies.push({
              pos: specialPos,
              type: createSpecialCandy(matchLength, true)
            });
          }
        }
        matchStart = col;
      }
    }
  }
  
  // Check vertical matches
  for (let col = 0; col < GRID_SIZE; col++) {
    let matchStart = 0;
    for (let row = 1; row <= GRID_SIZE; row++) {
      if (row === GRID_SIZE || grid[row][col] !== grid[matchStart][col]) {
        const matchLength = row - matchStart;
        if (matchLength >= 3) {
          // Add matches
          for (let i = matchStart; i < row; i++) {
            matches.push({ row: i, col });
          }
          // Create special candy if match is 4+
          if (matchLength >= 4) {
            const specialPos = { row: matchStart + Math.floor(matchLength / 2), col };
            specialCandies.push({
              pos: specialPos,
              type: createSpecialCandy(matchLength, false)
            });
          }
        }
        matchStart = row;
      }
    }
  }
  
  // Remove duplicates from matches
  const uniqueMatches = matches.filter((match, index, self) => 
    index === self.findIndex(m => m.row === match.row && m.col === match.col)
  );
  
  return { matches: uniqueMatches, specialCandies };
};

// Activate special candy effects
const activateSpecialCandy = (grid: GameGrid, pos: Position): Position[] => {
  const candy = grid[pos.row][pos.col];
  const affectedPositions: Position[] = [];
  
  switch (candy) {
    case SPECIAL_CANDIES.STRIPED_H:
      // Clear entire row
      for (let col = 0; col < GRID_SIZE; col++) {
        affectedPositions.push({ row: pos.row, col });
      }
      break;
    case SPECIAL_CANDIES.STRIPED_V:
      // Clear entire column
      for (let row = 0; row < GRID_SIZE; row++) {
        affectedPositions.push({ row, col: pos.col });
      }
      break;
    case SPECIAL_CANDIES.WRAPPED:
      // Clear 3x3 area around candy
      for (let r = Math.max(0, pos.row - 1); r <= Math.min(GRID_SIZE - 1, pos.row + 1); r++) {
        for (let c = Math.max(0, pos.col - 1); c <= Math.min(GRID_SIZE - 1, pos.col + 1); c++) {
          affectedPositions.push({ row: r, col: c });
        }
      }
      break;
    case SPECIAL_CANDIES.COLOR_BOMB:
      // Clear all candies of the same type as the swapped candy
      const targetType = grid[pos.row][pos.col];
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          if (grid[row][col] === targetType) {
            affectedPositions.push({ row, col });
          }
        }
      }
      break;
  }
  
  return affectedPositions;
};

// Remove matches and drop candies with special candy handling
const processMatches = (grid: GameGrid, candyIds: string[][], matches: Position[], specialCandies: { pos: Position; type: CandyType }[]): { newGrid: GameGrid; newIds: string[][]; score: number } => {
  const newGrid = grid.map(row => [...row]);
  const newIds = candyIds.map(row => [...row]);
  let score = matches.length * 10;
  let allMatches = [...matches];
  
  // Handle special candy activations
  matches.forEach(pos => {
    if (isSpecialCandy(grid[pos.row][pos.col])) {
      const specialMatches = activateSpecialCandy(grid, pos);
      allMatches.push(...specialMatches);
      score += specialMatches.length * 5; // Bonus points for special candies
    }
  });
  
  // Remove duplicates
  allMatches = allMatches.filter((match, index, self) => 
    index === self.findIndex(m => m.row === match.row && m.col === match.col)
  );
  
  // Remove matched candies
  allMatches.forEach(({ row, col }) => {
    newGrid[row][col] = '';
    newIds[row][col] = '';
  });
  
  // Place special candies before dropping
  specialCandies.forEach(({ pos, type }) => {
    if (newGrid[pos.row][pos.col] === '') {
      newGrid[pos.row][pos.col] = type;
      newIds[pos.row][pos.col] = `special-${pos.row}-${pos.col}-${Date.now()}`;
    }
  });
  
  // Drop candies down
  for (let col = 0; col < GRID_SIZE; col++) {
    let writeIndex = GRID_SIZE - 1;
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      if (newGrid[row][col] !== '') {
        newGrid[writeIndex][col] = newGrid[row][col];
        newIds[writeIndex][col] = newIds[row][col];
        if (writeIndex !== row) {
          newGrid[row][col] = '';
          newIds[row][col] = '';
        }
        writeIndex--;
      }
    }
    
    // Fill empty spaces with new candies
    for (let row = 0; row <= writeIndex; row++) {
      newGrid[row][col] = getRandomCandy();
      newIds[row][col] = `new-${row}-${col}-${Date.now()}-${Math.random()}`;
    }
  }
  
  return { newGrid, newIds, score };
};

export function Match3Game() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const { grid, ids } = createInitialGrid();
    return {
      grid,
      candyIds: ids,
      score: 0,
      moves: 20,
      selectedCandy: null,
      animating: false,
      matchedCandies: [],
      soundEnabled: true,
    };
  });

  const handleCandyClick = useCallback((row: number, col: number) => {
    if (gameState.moves <= 0) return;

    const position = { row, col };
    
    if (!gameState.selectedCandy) {
      // Select first candy
      if (gameState.soundEnabled) {
        soundManager.play('click');
      }
      setGameState(prev => ({
        ...prev,
        selectedCandy: position,
      }));
    } else if (gameState.selectedCandy.row === row && gameState.selectedCandy.col === col) {
      // Deselect if clicking the same candy
      if (gameState.soundEnabled) {
        soundManager.play('click');
      }
      setGameState(prev => ({
        ...prev,
        selectedCandy: null,
      }));
    } else if (areAdjacent(gameState.selectedCandy, position)) {
      // Swap adjacent candies
      const newGrid = gameState.grid.map(row => [...row]);
      const temp = newGrid[gameState.selectedCandy.row][gameState.selectedCandy.col];
      newGrid[gameState.selectedCandy.row][gameState.selectedCandy.col] = newGrid[row][col];
      newGrid[row][col] = temp;
      
      // Check for matches
      const { matches, specialCandies } = findMatches(newGrid);
      
      if (matches.length > 0) {
        // Play match sound
        if (gameState.soundEnabled) {
          soundManager.playMatchSound(matches.length);
          
          // Play special candy sounds if any were created
          specialCandies.forEach(({ type }) => {
            setTimeout(() => {
              soundManager.playSpecialSound(type);
            }, 300);
          });
        }
        
        // Valid move - show match animation first
        setGameState(prev => ({
          ...prev,
          matchedCandies: matches,
          animating: true,
        }));
        
        // Process matches after animation delay
        setTimeout(() => {
          setGameState(prev => {
            const { newGrid: processedGrid, newIds, score } = processMatches(newGrid, prev.candyIds, matches, specialCandies);
            return {
              grid: processedGrid,
              candyIds: newIds,
              score: prev.score + score,
              moves: prev.moves - 1,
              selectedCandy: null,
              animating: false,
              matchedCandies: [],
              soundEnabled: prev.soundEnabled,
            };
          });
        }, 600);
      } else {
        // Invalid move - swap back
        if (gameState.soundEnabled) {
          soundManager.play('click'); // Different sound for invalid move
        }
        setGameState(prev => ({
          ...prev,
          selectedCandy: null,
        }));
      }
    } else {
      // Select new candy if not adjacent
      if (gameState.soundEnabled) {
        soundManager.play('click');
      }
      setGameState(prev => ({
        ...prev,
        selectedCandy: position,
      }));
    }
  }, [gameState]);

  const resetGame = useCallback(() => {
    const { grid, ids } = createInitialGrid();
    if (gameState.soundEnabled) {
      soundManager.play('shuffle');
    }
    setGameState({
      grid,
      candyIds: ids,
      score: 0,
      moves: 20,
      selectedCandy: null,
      animating: false,
      matchedCandies: [],
      soundEnabled: gameState.soundEnabled,
    });
  }, [gameState.soundEnabled]);

  const isSelected = useCallback((row: number, col: number) => {
    return gameState.selectedCandy?.row === row && gameState.selectedCandy?.col === col;
  }, [gameState.selectedCandy]);
  
  const isMatched = useCallback((row: number, col: number) => {
    return gameState.matchedCandies.some(pos => pos.row === row && pos.col === col);
  }, [gameState.matchedCandies]);
  
  const toggleSound = useCallback(() => {
    setGameState(prev => {
      const newSoundEnabled = !prev.soundEnabled;
      soundManager.setEnabled(newSoundEnabled);
      if (newSoundEnabled) {
        soundManager.play('click');
      }
      return {
        ...prev,
        soundEnabled: newSoundEnabled,
      };
    });
  }, []);

  // Check for game over and play sound
  useEffect(() => {
    if (gameState.moves <= 0 && gameState.soundEnabled) {
      soundManager.play('gameOver');
    }
  }, [gameState.moves, gameState.soundEnabled]);

  const getCandyStyle = useCallback((row: number, col: number) => {
    const baseClasses = `
      aspect-square text-2xl flex items-center justify-center rounded-md
      border-2 border-transparent
    `;
    
    let stateClasses = '';
    
    if (isSelected(row, col)) {
      stateClasses = 'bg-[var(--app-accent)] bg-opacity-30 border-[var(--app-accent)] shadow-lg';
    } else if (isMatched(row, col)) {
      stateClasses = 'bg-red-500 bg-opacity-50 border-red-400';
    } else {
      stateClasses = 'bg-[var(--app-background)] hover:bg-[var(--app-gray)] hover:shadow-md';
    }
    
    return `${baseClasses} ${stateClasses}`;
  }, [isSelected, isMatched]);

  return (
    <div className="flex flex-col h-full max-w-md mx-auto p-4 space-y-4">
      {/* Game Header */}
      <div className="flex justify-between items-center w-full">
        <div className="text-center">
          <div className="text-sm text-[var(--app-foreground-muted)]">Score</div>
          <div className="text-lg font-bold text-[var(--app-accent)]">{gameState.score}</div>
        </div>
        
        {/* Sound Toggle */}
        <motion.button
          onClick={toggleSound}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-lg bg-[var(--app-card-bg)] border border-[var(--app-card-border)] hover:bg-[var(--app-gray)] transition-colors"
          title={gameState.soundEnabled ? "Sound On" : "Sound Off"}
        >
          <span className="text-lg">
            {gameState.soundEnabled ? '🔊' : '🔇'}
          </span>
        </motion.button>
        
        <div className="text-center">
          <div className="text-sm text-[var(--app-foreground-muted)]">Moves</div>
          <div className="text-lg font-bold text-[var(--app-accent)]">{gameState.moves}</div>
        </div>
      </div>

      {/* Game Grid */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm aspect-square">
          <div className="grid grid-cols-6 gap-1 h-full p-2 bg-[var(--app-card-bg)] rounded-lg border border-[var(--app-card-border)]">
            <AnimatePresence>
              {gameState.grid.map((row, rowIndex) =>
                row.map((candy, colIndex) => {
                  // Skip rendering matched candies during animation
                  if (gameState.animating && isMatched(rowIndex, colIndex)) {
                    return null;
                  }
                  
                  return (
                    <motion.button
                      key={gameState.candyIds[rowIndex][colIndex]}
                      layout
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: 1, 
                        opacity: 1,
                        rotate: 0
                      }}
                      exit={{ 
                        scale: 0, 
                        opacity: 0, 
                        rotate: 90,
                        transition: { duration: 0.2 }
                      }}
                      whileHover={{ scale: gameState.animating ? 1 : 1.1 }}
                      whileTap={{ scale: gameState.animating ? 1 : 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                        layout: { duration: 0.3 }
                      }}
                      onClick={() => handleCandyClick(rowIndex, colIndex)}
                      className={getCandyStyle(rowIndex, colIndex)}
                      disabled={gameState.moves <= 0 || gameState.animating}
                    >
                      <motion.span
                        animate={{
                          scale: isSpecialCandy(candy) ? [1, 1.2, 1] : 1
                        }}
                        transition={{
                          repeat: isSpecialCandy(candy) ? Infinity : 0,
                          duration: 2,
                          ease: "easeInOut"
                        }}
                      >
                        {candy}
                      </motion.span>
                    </motion.button>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Game Controls */}
      <div className="flex flex-col items-center space-y-3">
        {gameState.moves <= 0 && (
          <div className="text-center">
            <div className="text-lg font-bold text-[var(--app-accent)]">Game Over!</div>
            <div className="text-sm text-[var(--app-foreground-muted)]">Final Score: {gameState.score}</div>
          </div>
        )}
        
        <motion.button
          onClick={resetGame}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-2 bg-[var(--app-accent)] text-[var(--app-background)] rounded-lg hover:bg-[var(--app-accent-hover)] transition-colors font-medium shadow-lg"
        >
          New Game
        </motion.button>
        
        {/* Instructions */}
        <div className="text-xs text-[var(--app-foreground-muted)] text-center">
          Click a candy, then click an adjacent candy to swap. Match 3+ to score!
        </div>
      </div>
    </div>
  );
}
