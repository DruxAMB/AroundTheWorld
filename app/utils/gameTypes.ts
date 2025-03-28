// Game types and constants for Around The World

// Region types
export enum Region {
  LATAM = 'latam',
  AFRICA = 'africa',
  SOUTHEAST_ASIA = 'southeast-asia',
  INDIA = 'india'
}

// Game item types
export interface GameItem {
  id: string;
  type: string;
  image: string;
  region: Region;
}

// Level configuration
export interface LevelConfig {
  region: Region;
  gridSize: { rows: number; cols: number };
  targetScore: number;
  timeLimit: number; // in seconds
  items: GameItem[];
}

// Game state
export enum GameState {
  INTRO = 'intro',
  PLAYING = 'playing',
  PAUSED = 'paused',
  LEVEL_COMPLETE = 'level_complete',
  GAME_OVER = 'game_over',
  GAME_WON = 'game_won'
}

// Power-up types
export enum PowerUpType {
  ROW_CLEAR = 'row_clear',
  COLUMN_CLEAR = 'column_clear',
  AREA_CLEAR = 'area_clear',
  EXTRA_TIME = 'extra_time',
  SCORE_MULTIPLIER = 'score_multiplier'
}

// Power-up interface
export interface PowerUp {
  type: PowerUpType;
  icon: string;
  description: string;
  effect: () => void;
}

// Player stats
export interface PlayerStats {
  score: number;
  level: number;
  powerUps: PowerUp[];
  timeRemaining: number;
}

// Game cell position
export interface Position {
  row: number;
  col: number;
}

// Game grid cell
export interface Cell {
  item: GameItem | null;
  position: Position;
  isSelected: boolean;
  isMatched: boolean;
  isPowerUp: boolean;
  powerUpType?: PowerUpType;
}

// Match result
export interface MatchResult {
  matched: Position[];
  score: number;
  powerUps: PowerUpType[];
}

// Leaderboard entry
export interface LeaderboardEntry {
  address: string;
  score: number;
  level: number;
  timestamp: number;
}
