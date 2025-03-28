"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Cell, Position, GameItem, PowerUp, PowerUpType, GameState } from '../../utils/gameTypes';
import { createGrid, areAdjacent, swapCells, checkMatches, markMatchedCells, removeMatchedAndRefill, createPowerUp, checkPossibleMoves, shuffleGrid, applyPowerUp } from '../../utils/gameEngine';
import { playSound } from '../../utils/sound';
import PowerUps from './PowerUps';

interface GameBoardProps {
  level: number;
  items: GameItem[];
  rows: number;
  cols: number;
  onScoreUpdate: (score: number) => void;
  onGameStateChange: (state: GameState) => void;
  onLevelComplete: () => void;
  targetScore: number;
  timeLimit: number;
}

const GameBoard: React.FC<GameBoardProps> = ({
  level,
  items,
  rows,
  cols,
  onScoreUpdate,
  onGameStateChange,
  onLevelComplete,
  targetScore,
  timeLimit
}) => {
  // Game state
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [selectedCell, setSelectedCell] = useState<Position | null>(null);
  const [score, setScore] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(timeLimit);
  const [gameState, setGameState] = useState<GameState>(GameState.PLAYING);
  const [availablePowerUps, setAvailablePowerUps] = useState<PowerUp[]>([]);
  const [scoreMultiplier, setScoreMultiplier] = useState<number>(1);
  const [multiplierTimeRemaining, setMultiplierTimeRemaining] = useState<number>(0);

  // Initialize the game board
  useEffect(() => {
    const initialGrid = createGrid(rows, cols, items);
    setGrid(initialGrid);
    setScore(0);
    setTimeRemaining(timeLimit);
    setGameState(GameState.PLAYING);
    setAvailablePowerUps([]);
    setScoreMultiplier(1);
    setMultiplierTimeRemaining(0);
  }, [level, items, rows, cols, timeLimit]);

  // Timer countdown
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const timer = setInterval(() => {
      setTimeRemaining(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          // Check if player reached target score
          if (score >= targetScore) {
            setGameState(GameState.LEVEL_COMPLETE);
            onGameStateChange(GameState.LEVEL_COMPLETE);
            playSound('levelComplete');
            onLevelComplete();
          } else {
            setGameState(GameState.GAME_OVER);
            onGameStateChange(GameState.GAME_OVER);
            playSound('gameOver'); // Play a dedicated game over sound
          }
          return 0;
        }
        return prevTime - 1;
      });

      // Update score multiplier timer if active
      if (multiplierTimeRemaining > 0) {
        setMultiplierTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            setScoreMultiplier(1);
            return 0;
          }
          return prevTime - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, score, targetScore, onGameStateChange, onLevelComplete, multiplierTimeRemaining]);

  // Check for level completion
  useEffect(() => {
    if (score >= targetScore && gameState === GameState.PLAYING) {
      setGameState(GameState.LEVEL_COMPLETE);
      onGameStateChange(GameState.LEVEL_COMPLETE);
      playSound('levelComplete');
      onLevelComplete();
    }
  }, [score, targetScore, gameState, onGameStateChange, onLevelComplete]);

  // Handle cell selection and swapping
  const handleCellClick = useCallback((position: Position) => {
    if (gameState !== GameState.PLAYING) return;

    // If the clicked cell contains a power-up, activate it
    const clickedCell = grid[position.row][position.col];
    if (clickedCell.isPowerUp && clickedCell.powerUpType) {
      const { grid: newGrid, score: powerUpScore } = applyPowerUp(grid, position, clickedCell.powerUpType, items);
      setGrid(newGrid);
      
      // Update score with multiplier
      const scoreToAdd = powerUpScore * scoreMultiplier;
      setScore(prevScore => {
        const newScore = prevScore + scoreToAdd;
        onScoreUpdate(newScore);
        return newScore;
      });
      
      // Process matches after power-up
      setTimeout(() => {
        const updatedGrid = removeMatchedAndRefill(newGrid, items);
        setGrid(updatedGrid);
        
        // Check for new matches after refill
        processMatches(updatedGrid);
      }, 500);
      
      return;
    }

    // If no cell is selected, select this one
    if (!selectedCell) {
      setSelectedCell(position);
      // Update grid to show selection
      const newGrid = [...grid];
      newGrid[position.row][position.col].isSelected = true;
      setGrid(newGrid);
      return;
    }

    // If the same cell is clicked again, deselect it
    if (position.row === selectedCell.row && position.col === selectedCell.col) {
      setSelectedCell(null);
      // Update grid to remove selection
      const newGrid = [...grid];
      newGrid[position.row][position.col].isSelected = false;
      setGrid(newGrid);
      return;
    }

    // Check if the cells are adjacent
    if (areAdjacent(selectedCell, position)) {
      // Swap the cells
      const newGrid = swapCells(grid, selectedCell, position);
      
      // Clear selection
      newGrid[selectedCell.row][selectedCell.col].isSelected = false;
      setSelectedCell(null);
      
      // Check for matches after swap
      const matchResult = checkMatches(newGrid);
      
      // If no matches, swap back
      if (matchResult.matched.length === 0) {
        setTimeout(() => {
          const revertedGrid = swapCells(newGrid, selectedCell, position);
          setGrid(revertedGrid);
        }, 300);
        return;
      }
      
      // Process the matches
      setGrid(newGrid);
      processMatches(newGrid);
    } else {
      // Not adjacent, select the new cell instead
      const newGrid = [...grid];
      newGrid[selectedCell.row][selectedCell.col].isSelected = false;
      newGrid[position.row][position.col].isSelected = true;
      setGrid(newGrid);
      setSelectedCell(position);
    }
  }, [grid, selectedCell, gameState, items, scoreMultiplier, onScoreUpdate]);

  // Process matches in the grid
  const processMatches = useCallback((currentGrid: Cell[][]) => {
    const matchResult = checkMatches(currentGrid);
    
    if (matchResult.matched.length > 0) {
      // Mark matched cells
      const markedGrid = markMatchedCells(currentGrid, matchResult.matched);
      setGrid(markedGrid);
      
      // Update score with multiplier
      const scoreToAdd = matchResult.score * scoreMultiplier;
      setScore(prevScore => {
        const newScore = prevScore + scoreToAdd;
        onScoreUpdate(newScore);
        return newScore;
      });
      
      // Create power-ups if applicable
      if (matchResult.powerUps.length > 0) {
        // Create power-up at the first matched position
        const powerUpPosition = matchResult.matched[0];
        const powerUpType = matchResult.powerUps[0];
        
        // Add to available power-ups
        const newPowerUp = {
          type: powerUpType,
          icon: getPowerUpIcon(powerUpType),
          description: getPowerUpDescription(powerUpType),
          effect: () => {} // Will be defined when used
        };
        
        setAvailablePowerUps(prev => [...prev, newPowerUp]);
        
        // Create power-up in the grid
        const gridWithPowerUp = createPowerUp(markedGrid, powerUpPosition, powerUpType);
        setGrid(gridWithPowerUp);
      }
      
      // Remove matched cells and refill after a delay
      setTimeout(() => {
        const updatedGrid = removeMatchedAndRefill(markedGrid, items);
        setGrid(updatedGrid);
        
        // Check for new matches after refill
        setTimeout(() => {
          const cascadeMatchResult = checkMatches(updatedGrid);
          if (cascadeMatchResult.matched.length > 0) {
            processMatches(updatedGrid);
          } else if (!checkPossibleMoves(updatedGrid)) {
            // No more possible moves, shuffle the grid
            const shuffledGrid = shuffleGrid(updatedGrid, items);
            setGrid(shuffledGrid);
          }
        }, 300);
      }, 500);
    }
  }, [items, scoreMultiplier, onScoreUpdate]);

  // Handle power-up usage
  const handleUsePowerUp = useCallback((powerUp: PowerUp) => {
    if (gameState !== GameState.PLAYING) return;
    
    // Remove the power-up from available ones
    setAvailablePowerUps(prev => prev.filter(p => p !== powerUp));
    
    // Apply power-up effect based on type
    switch (powerUp.type) {
      case PowerUpType.EXTRA_TIME:
        // Add 15 seconds to the timer
        setTimeRemaining(prev => prev + 15);
        break;
        
      case PowerUpType.SCORE_MULTIPLIER:
        // Double score for 30 seconds
        setScoreMultiplier(2);
        setMultiplierTimeRemaining(30);
        break;
        
      default:
        // For other power-ups, they need a target cell
        // We'll handle this in the UI by changing the game mode
        // to "power-up selection" mode
        break;
    }
  }, [gameState]);

  // Helper functions for power-ups
  const getPowerUpIcon = (type: PowerUpType): string => {
    switch (type) {
      case PowerUpType.ROW_CLEAR: return '↔️';
      case PowerUpType.COLUMN_CLEAR: return '↕️';
      case PowerUpType.AREA_CLEAR: return '💥';
      case PowerUpType.EXTRA_TIME: return '⏱️';
      case PowerUpType.SCORE_MULTIPLIER: return '✖️';
      default: return '';
    }
  };
  
  const getPowerUpDescription = (type: PowerUpType): string => {
    switch (type) {
      case PowerUpType.ROW_CLEAR: return 'Clears an entire row';
      case PowerUpType.COLUMN_CLEAR: return 'Clears an entire column';
      case PowerUpType.AREA_CLEAR: return 'Clears a 3x3 area';
      case PowerUpType.EXTRA_TIME: return 'Adds 15 seconds to the timer';
      case PowerUpType.SCORE_MULTIPLIER: return 'Doubles points for 30 seconds';
      default: return '';
    }
  };

  // Render game board
  return (
    <div className="game-container">
      {/* Game info */}
      <div className="game-info flex justify-between items-center mb-4 p-2 bg-gray-100 rounded-lg">
        <div className="level-info">
          <h3 className="text-lg font-bold">Level {level + 1}</h3>
          <p className="text-sm">Target: {targetScore}</p>
        </div>
        <div className="score-info text-center">
          <h3 className="text-lg font-bold">Score</h3>
          <p className="text-xl">{score}</p>
          {scoreMultiplier > 1 && (
            <p className="text-sm text-green-600">x{scoreMultiplier} ({multiplierTimeRemaining}s)</p>
          )}
        </div>
        <div className="time-info text-right">
          <h3 className="text-lg font-bold">Time</h3>
          <p className={`text-xl ${timeRemaining < 10 ? 'text-red-500' : ''}`}>
            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </p>
        </div>
      </div>
      
      {/* Power-ups */}
      <PowerUps 
        availablePowerUps={availablePowerUps} 
        onUsePowerUp={handleUsePowerUp} 
      />
      
      {/* Game grid */}
      <div 
        className="game-grid grid gap-1 bg-gray-200 p-2 rounded-lg"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`
        }}
      >
        {grid.map((row, rowIndex) => 
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`game-cell relative aspect-square flex items-center justify-center rounded cursor-pointer transition-all duration-200 ${
                cell.isSelected ? 'border-2 border-yellow-400 scale-110 z-10' : ''
              } ${
                cell.isMatched ? 'opacity-50' : ''
              } ${
                cell.isPowerUp ? 'bg-blue-100' : 'bg-white'
              }`}
              onClick={() => handleCellClick({ row: rowIndex, col: colIndex })}
            >
              {cell.item && (
                <div className="w-full h-full p-1">
                  <img 
                    src={cell.item.image} 
                    alt={cell.item.type}
                    className="w-full h-full object-cover rounded"
                  />
                  {cell.isPowerUp && cell.powerUpType && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500 bg-opacity-50 rounded">
                      <span className="text-2xl">{getPowerUpIcon(cell.powerUpType)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Game state overlays */}
      {gameState === GameState.LEVEL_COMPLETE && (
        <div className="level-complete-overlay fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="bg-white p-6 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Level Complete!</h2>
            <p className="text-lg mb-2">Score: {score}</p>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={onLevelComplete}
            >
              Next Level
            </button>
          </div>
        </div>
      )}
      
      {gameState === GameState.GAME_OVER && (
        <div className="game-over-overlay fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="bg-white p-6 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Game Over</h2>
            <p className="text-lg mb-2">Score: {score}</p>
            <p className="text-md mb-4">Target: {targetScore}</p>
            <button 
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={() => {
                // Reset the level
                const initialGrid = createGrid(rows, cols, items);
                setGrid(initialGrid);
                setScore(0);
                setTimeRemaining(timeLimit);
                setGameState(GameState.PLAYING);
                onGameStateChange(GameState.PLAYING);
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
