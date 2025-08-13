"use client";

import { useState, useCallback, useEffect } from "react";

// Game configuration
const GRID_SIZE = 6;
const CANDY_TYPES = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒'];

type CandyType = string;
type Position = { row: number; col: number };
type GameGrid = CandyType[][];

interface GameState {
  grid: GameGrid;
  score: number;
  moves: number;
  selectedCandy: Position | null;
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

// Find matches in the grid
const findMatches = (grid: GameGrid): Position[] => {
  const matches: Position[] = [];
  
  // Check horizontal matches
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE - 2; col++) {
      if (grid[row][col] === grid[row][col + 1] && 
          grid[row][col] === grid[row][col + 2]) {
        matches.push({ row, col });
        matches.push({ row, col: col + 1 });
        matches.push({ row, col: col + 2 });
      }
    }
  }
  
  // Check vertical matches
  for (let row = 0; row < GRID_SIZE - 2; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === grid[row + 1][col] && 
          grid[row][col] === grid[row + 2][col]) {
        matches.push({ row, col });
        matches.push({ row: row + 1, col });
        matches.push({ row: row + 2, col });
      }
    }
  }
  
  // Remove duplicates
  return matches.filter((match, index, self) => 
    index === self.findIndex(m => m.row === match.row && m.col === match.col)
  );
};

// Remove matches and drop candies
const processMatches = (grid: GameGrid, matches: Position[]): { newGrid: GameGrid; score: number } => {
  const newGrid = grid.map(row => [...row]);
  let score = matches.length * 10;
  
  // Remove matched candies
  matches.forEach(({ row, col }) => {
    newGrid[row][col] = '';
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
      const matches = findMatches(newGrid);
      
      if (matches.length > 0) {
        // Valid move - process matches
        const { newGrid: processedGrid, score } = processMatches(newGrid, matches);
        setGameState(prev => ({
          grid: processedGrid,
          score: prev.score + score,
          moves: prev.moves - 1,
          selectedCandy: null,
        }));
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
    });
  }, []);

  const isSelected = useCallback((row: number, col: number) => {
    return gameState.selectedCandy?.row === row && gameState.selectedCandy?.col === col;
  }, [gameState.selectedCandy]);

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
              className={`
                w-8 h-8 text-lg flex items-center justify-center rounded-md
                transition-all duration-200 hover:scale-110
                ${isSelected(rowIndex, colIndex) 
                  ? 'bg-[var(--app-accent)] bg-opacity-30 ring-2 ring-[var(--app-accent)]' 
                  : 'bg-[var(--app-background)] hover:bg-[var(--app-gray)]'
                }
              `}
              disabled={gameState.moves <= 0}
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
