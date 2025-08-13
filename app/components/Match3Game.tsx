"use client";

import { useState, useCallback, useEffect } from "react";

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
type AnimationType = 'drop' | 'match' | 'special' | null;
type CandyState = {
  type: CandyType;
  animation: AnimationType;
  isMatched: boolean;
};

interface GameState {
  grid: GameGrid;
  score: number;
  moves: number;
  selectedCandy: Position | null;
  animating: boolean;
  matchedCandies: Position[];
}

// Generate random candy
const getRandomCandy = (): CandyType => {
  return CANDY_TYPES[Math.floor(Math.random() * CANDY_TYPES.length)];
};

// Create initial grid
const createInitialGrid = (): GameGrid => {
  const grid: GameGrid = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      grid[row][col] = getRandomCandy();
    }
  }
  return grid;
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
const processMatches = (grid: GameGrid, matches: Position[], specialCandies: { pos: Position; type: CandyType }[]): { newGrid: GameGrid; score: number } => {
  const newGrid = grid.map(row => [...row]);
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
  });
  
  // Place special candies before dropping
  specialCandies.forEach(({ pos, type }) => {
    if (newGrid[pos.row][pos.col] === '') {
      newGrid[pos.row][pos.col] = type;
    }
  });
  
  // Drop candies down
  for (let col = 0; col < GRID_SIZE; col++) {
    let writeIndex = GRID_SIZE - 1;
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      if (newGrid[row][col] !== '') {
        newGrid[writeIndex][col] = newGrid[row][col];
        if (writeIndex !== row) {
          newGrid[row][col] = '';
        }
        writeIndex--;
      }
    }
    
    // Fill empty spaces with new candies
    for (let row = 0; row <= writeIndex; row++) {
      newGrid[row][col] = getRandomCandy();
    }
  }
  
  return { newGrid, score };
};

export function Match3Game() {
  const [gameState, setGameState] = useState<GameState>(() => ({
    grid: createInitialGrid(),
    score: 0,
    moves: 20,
    selectedCandy: null,
    animating: false,
    matchedCandies: [],
  }));

  const handleCandyClick = useCallback((row: number, col: number) => {
    if (gameState.moves <= 0) return;

    const position = { row, col };
    
    if (!gameState.selectedCandy) {
      // Select first candy
      setGameState(prev => ({
        ...prev,
        selectedCandy: position,
      }));
    } else if (gameState.selectedCandy.row === row && gameState.selectedCandy.col === col) {
      // Deselect if clicking the same candy
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
        // Valid move - show match animation first
        setGameState(prev => ({
          ...prev,
          matchedCandies: matches,
          animating: true,
        }));
        
        // Process matches after animation delay
        setTimeout(() => {
          const { newGrid: processedGrid, score } = processMatches(newGrid, matches, specialCandies);
          setGameState(prev => ({
            grid: processedGrid,
            score: prev.score + score,
            moves: prev.moves - 1,
            selectedCandy: null,
            animating: false,
            matchedCandies: [],
          }));
        }, 500);
      } else {
        // Invalid move - swap back
        setGameState(prev => ({
          ...prev,
          selectedCandy: null,
        }));
      }
    } else {
      // Select new candy if not adjacent
      setGameState(prev => ({
        ...prev,
        selectedCandy: position,
      }));
    }
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState({
      grid: createInitialGrid(),
      score: 0,
      moves: 20,
      selectedCandy: null,
      animating: false,
      matchedCandies: [],
    });
  }, []);

  const isSelected = useCallback((row: number, col: number) => {
    return gameState.selectedCandy?.row === row && gameState.selectedCandy?.col === col;
  }, [gameState.selectedCandy]);
  
  const isMatched = useCallback((row: number, col: number) => {
    return gameState.matchedCandies.some(pos => pos.row === row && pos.col === col);
  }, [gameState.matchedCandies]);
  
  const getCandyStyle = useCallback((row: number, col: number) => {
    const baseClasses = `
      w-8 h-8 text-lg flex items-center justify-center rounded-md
      transition-all duration-200 hover:scale-110
    `;
    
    let stateClasses = '';
    
    if (isSelected(row, col)) {
      stateClasses = 'bg-[var(--app-accent)] bg-opacity-30 ring-2 ring-[var(--app-accent)]';
    } else if (isMatched(row, col)) {
      stateClasses = 'bg-red-500 bg-opacity-50 animate-pulse scale-110';
    } else {
      stateClasses = 'bg-[var(--app-background)] hover:bg-[var(--app-gray)]';
    }
    
    return `${baseClasses} ${stateClasses}`;
  }, [isSelected, isMatched]);

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      {/* Game Header */}
      <div className="flex justify-between w-full max-w-sm">
        <div className="text-center">
          <div className="text-sm text-[var(--app-foreground-muted)]">Score</div>
          <div className="text-lg font-bold text-[var(--app-accent)]">{gameState.score}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-[var(--app-foreground-muted)]">Moves</div>
          <div className="text-lg font-bold text-[var(--app-accent)]">{gameState.moves}</div>
        </div>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-6 gap-1 p-2 bg-[var(--app-card-bg)] rounded-lg border border-[var(--app-card-border)]">
        {gameState.grid.map((row, rowIndex) =>
          row.map((candy, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleCandyClick(rowIndex, colIndex)}
              className={getCandyStyle(rowIndex, colIndex)}
              disabled={gameState.moves <= 0 || gameState.animating}
            >
              {candy}
            </button>
          ))
        )}
      </div>

      {/* Game Controls */}
      <div className="flex flex-col items-center space-y-2">
        {gameState.moves <= 0 && (
          <div className="text-center">
            <div className="text-lg font-bold text-[var(--app-accent)]">Game Over!</div>
            <div className="text-sm text-[var(--app-foreground-muted)]">Final Score: {gameState.score}</div>
          </div>
        )}
        
        <button
          onClick={resetGame}
          className="px-4 py-2 bg-[var(--app-accent)] text-[var(--app-background)] rounded-lg hover:bg-[var(--app-accent-hover)] transition-colors"
        >
          New Game
        </button>
      </div>

      {/* Instructions */}
      <div className="text-xs text-[var(--app-foreground-muted)] text-center max-w-sm">
        Click a candy, then click an adjacent candy to swap. Match 3 or more in a row to score points!
      </div>
    </div>
  );
}
