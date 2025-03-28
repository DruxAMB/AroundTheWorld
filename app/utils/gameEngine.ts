import { 
  Cell, 
  Position, 
  GameItem, 
  MatchResult, 
  PowerUpType,
  GameState
} from './gameTypes';
import { getItemsByRegion } from './gameData';
import { playSound } from './sound';

// Create a new game grid
export const createGrid = (rows: number, cols: number, items: GameItem[]): Cell[][] => {
  const grid: Cell[][] = [];
  
  for (let row = 0; row < rows; row++) {
    grid[row] = [];
    for (let col = 0; col < cols; col++) {
      // Get random item for this cell
      const randomIndex = Math.floor(Math.random() * items.length);
      const item = items[randomIndex];
      
      grid[row][col] = {
        item,
        position: { row, col },
        isSelected: false,
        isMatched: false,
        isPowerUp: false
      };
    }
  }
  
  // Ensure no matches exist at the start of the game
  return ensureNoInitialMatches(grid, items);
};

// Ensure no matches exist at the start of the game
const ensureNoInitialMatches = (grid: Cell[][], items: GameItem[]): Cell[][] => {
  const rows = grid.length;
  const cols = grid[0].length;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Check horizontal matches of 3
      if (col >= 2) {
        if (
          grid[row][col].item?.type === grid[row][col-1].item?.type &&
          grid[row][col].item?.type === grid[row][col-2].item?.type
        ) {
          // Replace current cell with a different item
          const currentType = grid[row][col].item?.type;
          let newItem;
          do {
            const randomIndex = Math.floor(Math.random() * items.length);
            newItem = items[randomIndex];
          } while (newItem.type === currentType);
          
          grid[row][col].item = newItem;
        }
      }
      
      // Check vertical matches of 3
      if (row >= 2) {
        if (
          grid[row][col].item?.type === grid[row-1][col].item?.type &&
          grid[row][col].item?.type === grid[row-2][col].item?.type
        ) {
          // Replace current cell with a different item
          const currentType = grid[row][col].item?.type;
          let newItem;
          do {
            const randomIndex = Math.floor(Math.random() * items.length);
            newItem = items[randomIndex];
          } while (newItem.type === currentType);
          
          grid[row][col].item = newItem;
        }
      }
    }
  }
  
  return grid;
};

// Check if two positions are adjacent
export const areAdjacent = (pos1: Position, pos2: Position): boolean => {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  
  // Adjacent if they're next to each other horizontally or vertically (not diagonally)
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

// Swap two cells in the grid
export const swapCells = (grid: Cell[][], pos1: Position, pos2: Position): Cell[][] => {
  const newGrid = [...grid];
  
  // Swap items
  const tempItem = newGrid[pos1.row][pos1.col].item;
  newGrid[pos1.row][pos1.col].item = newGrid[pos2.row][pos2.col].item;
  newGrid[pos2.row][pos2.col].item = tempItem;
  
  // Swap power-up status
  const tempIsPowerUp = newGrid[pos1.row][pos1.col].isPowerUp;
  const tempPowerUpType = newGrid[pos1.row][pos1.col].powerUpType;
  
  newGrid[pos1.row][pos1.col].isPowerUp = newGrid[pos2.row][pos2.col].isPowerUp;
  newGrid[pos1.row][pos1.col].powerUpType = newGrid[pos2.row][pos2.col].powerUpType;
  
  newGrid[pos2.row][pos2.col].isPowerUp = tempIsPowerUp;
  newGrid[pos2.row][pos2.col].powerUpType = tempPowerUpType;
  
  // Play sound effect
  playSound('slash');
  
  return newGrid;
};

// Check for matches in the grid
export const checkMatches = (grid: Cell[][]): MatchResult => {
  const rows = grid.length;
  const cols = grid[0].length;
  const matched: Position[] = [];
  let score = 0;
  const powerUps: PowerUpType[] = [];
  
  // Check horizontal matches
  for (let row = 0; row < rows; row++) {
    let matchCount = 1;
    let matchType = grid[row][0].item?.type;
    
    for (let col = 1; col < cols; col++) {
      const currentType = grid[row][col].item?.type;
      
      if (currentType === matchType) {
        matchCount++;
      } else {
        // Check if we have a match of 3 or more
        if (matchCount >= 3) {
          // Add matched positions
          for (let i = col - matchCount; i < col; i++) {
            matched.push({ row, col: i });
          }
          
          // Calculate score (more matches = more points)
          score += matchCount * 10;
          
          // Create power-up for matches of 4 or more
          if (matchCount >= 4) {
            powerUps.push(matchCount === 4 ? PowerUpType.ROW_CLEAR : PowerUpType.AREA_CLEAR);
          }
        }
        
        // Reset match tracking
        matchCount = 1;
        matchType = currentType;
      }
    }
    
    // Check for match at the end of the row
    if (matchCount >= 3) {
      for (let i = cols - matchCount; i < cols; i++) {
        matched.push({ row, col: i });
      }
      score += matchCount * 10;
      
      if (matchCount >= 4) {
        powerUps.push(matchCount === 4 ? PowerUpType.ROW_CLEAR : PowerUpType.AREA_CLEAR);
      }
    }
  }
  
  // Check vertical matches
  for (let col = 0; col < cols; col++) {
    let matchCount = 1;
    let matchType = grid[0][col].item?.type;
    
    for (let row = 1; row < rows; row++) {
      const currentType = grid[row][col].item?.type;
      
      if (currentType === matchType) {
        matchCount++;
      } else {
        // Check if we have a match of 3 or more
        if (matchCount >= 3) {
          // Add matched positions
          for (let i = row - matchCount; i < row; i++) {
            // Avoid duplicating positions already counted in horizontal matches
            if (!matched.some(pos => pos.row === i && pos.col === col)) {
              matched.push({ row: i, col });
            }
          }
          
          // Calculate score
          score += matchCount * 10;
          
          // Create power-up for matches of 4 or more
          if (matchCount >= 4) {
            powerUps.push(matchCount === 4 ? PowerUpType.COLUMN_CLEAR : PowerUpType.AREA_CLEAR);
          }
        }
        
        // Reset match tracking
        matchCount = 1;
        matchType = currentType;
      }
    }
    
    // Check for match at the end of the column
    if (matchCount >= 3) {
      for (let i = rows - matchCount; i < rows; i++) {
        if (!matched.some(pos => pos.row === i && pos.col === col)) {
          matched.push({ row: i, col });
        }
      }
      score += matchCount * 10;
      
      if (matchCount >= 4) {
        powerUps.push(matchCount === 4 ? PowerUpType.COLUMN_CLEAR : PowerUpType.AREA_CLEAR);
      }
    }
  }
  
  // If matches found, play sound
  if (matched.length > 0) {
    playSound('match');
  }
  
  return { matched, score, powerUps };
};

// Mark matched cells in the grid
export const markMatchedCells = (grid: Cell[][], matched: Position[]): Cell[][] => {
  const newGrid = [...grid];
  
  matched.forEach(pos => {
    if (newGrid[pos.row] && newGrid[pos.row][pos.col]) {
      newGrid[pos.row][pos.col].isMatched = true;
    }
  });
  
  return newGrid;
};

// Remove matched cells and refill the grid
export const removeMatchedAndRefill = (grid: Cell[][], items: GameItem[]): Cell[][] => {
  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid = [...grid];
  
  // Step 1: Remove matched cells (set to null)
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      if (newGrid[row][col].isMatched) {
        newGrid[row][col].item = null;
        newGrid[row][col].isMatched = false;
      }
    }
  }
  
  // Step 2: Shift cells down to fill empty spaces
  for (let col = 0; col < cols; col++) {
    let emptyRow = rows - 1;
    
    // Find and shift cells down
    for (let row = rows - 1; row >= 0; row--) {
      if (newGrid[row][col].item !== null) {
        if (row !== emptyRow) {
          // Move this item down to the empty row
          newGrid[emptyRow][col].item = newGrid[row][col].item;
          newGrid[row][col].item = null;
        }
        emptyRow--;
      }
    }
    
    // Step 3: Fill empty cells at the top with new random items
    for (let row = emptyRow; row >= 0; row--) {
      const randomIndex = Math.floor(Math.random() * items.length);
      newGrid[row][col].item = items[randomIndex];
    }
  }
  
  return newGrid;
};

// Apply power-up effect to the grid
export const applyPowerUp = (grid: Cell[][], position: Position, powerUpType: PowerUpType, items: GameItem[]): { grid: Cell[][], score: number } => {
  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid = [...grid];
  let score = 0;
  const affectedPositions: Position[] = [];
  
  switch (powerUpType) {
    case PowerUpType.ROW_CLEAR:
      // Clear entire row
      for (let col = 0; col < cols; col++) {
        if (newGrid[position.row][col].item) {
          affectedPositions.push({ row: position.row, col });
          score += 10;
        }
      }
      break;
      
    case PowerUpType.COLUMN_CLEAR:
      // Clear entire column
      for (let row = 0; row < rows; row++) {
        if (newGrid[row][position.col].item) {
          affectedPositions.push({ row, col: position.col });
          score += 10;
        }
      }
      break;
      
    case PowerUpType.AREA_CLEAR:
      // Clear 3x3 area around the position
      for (let row = Math.max(0, position.row - 1); row <= Math.min(rows - 1, position.row + 1); row++) {
        for (let col = Math.max(0, position.col - 1); col <= Math.min(cols - 1, position.col + 1); col++) {
          if (newGrid[row][col].item) {
            affectedPositions.push({ row, col });
            score += 10;
          }
        }
      }
      break;
      
    default:
      break;
  }
  
  // Mark affected positions as matched
  affectedPositions.forEach(pos => {
    newGrid[pos.row][pos.col].isMatched = true;
  });
  
  // Play power-up sound
  playSound('powerUp');
  
  // Remove the power-up from the cell
  newGrid[position.row][position.col].isPowerUp = false;
  newGrid[position.row][position.col].powerUpType = undefined;
  
  return { grid: newGrid, score };
};

// Create a power-up in the grid
export const createPowerUp = (grid: Cell[][], position: Position, powerUpType: PowerUpType): Cell[][] => {
  const newGrid = [...grid];
  
  newGrid[position.row][position.col].isPowerUp = true;
  newGrid[position.row][position.col].powerUpType = powerUpType;
  
  return newGrid;
};

// Check if there are any possible moves left
export const checkPossibleMoves = (grid: Cell[][]): boolean => {
  const rows = grid.length;
  const cols = grid[0].length;
  
  // Check each cell for potential matches if swapped with adjacent cells
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const currentType = grid[row][col].item?.type;
      
      // Check right swap
      if (col < cols - 1) {
        const rightType = grid[row][col + 1].item?.type;
        
        // Temporarily swap
        grid[row][col].item!.type = rightType!;
        grid[row][col + 1].item!.type = currentType!;
        
        // Check for matches
        const hasMatch = checkMatches(grid).matched.length > 0;
        
        // Swap back
        grid[row][col].item!.type = currentType!;
        grid[row][col + 1].item!.type = rightType!;
        
        if (hasMatch) return true;
      }
      
      // Check down swap
      if (row < rows - 1) {
        const downType = grid[row + 1][col].item?.type;
        
        // Temporarily swap
        grid[row][col].item!.type = downType!;
        grid[row + 1][col].item!.type = currentType!;
        
        // Check for matches
        const hasMatch = checkMatches(grid).matched.length > 0;
        
        // Swap back
        grid[row][col].item!.type = currentType!;
        grid[row + 1][col].item!.type = downType!;
        
        if (hasMatch) return true;
      }
    }
  }
  
  return false;
};

// Shuffle the grid when no moves are available
export const shuffleGrid = (grid: Cell[][], items: GameItem[]): Cell[][] => {
  const rows = grid.length;
  const cols = grid[0].length;
  const newGrid = [...grid];
  
  // Collect all items from the grid
  const allItems: GameItem[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (newGrid[row][col].item) {
        allItems.push(newGrid[row][col].item!);
      }
    }
  }
  
  // Shuffle the items
  for (let i = allItems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
  }
  
  // Redistribute items to the grid
  let itemIndex = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (newGrid[row][col].item) {
        newGrid[row][col].item = allItems[itemIndex++];
      }
    }
  }
  
  // Ensure the shuffled grid has possible moves
  if (!checkPossibleMoves(newGrid)) {
    return shuffleGrid(newGrid, items); // Recursively shuffle until we have valid moves
  }
  
  return newGrid;
};
