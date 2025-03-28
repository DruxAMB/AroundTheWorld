import { LevelConfig, Region, GameItem, PowerUpType } from './gameTypes';

// Define game items for each region
const latamItems: GameItem[] = [
  { id: 'latam-1', type: 'taco', image: '/latam/aneri.jpg', region: Region.LATAM },
  { id: 'latam-2', type: 'empanada', image: '/latam/bobby.jpg', region: Region.LATAM },
  { id: 'latam-3', type: 'acai', image: '/latam/david.jpg', region: Region.LATAM },
  { id: 'latam-4', type: 'churro', image: '/latam/jacob.jpg', region: Region.LATAM },
  { id: 'latam-5', type: 'guacamole', image: '/latam/jesse.jpg', region: Region.LATAM },
  { id: 'latam-6', type: 'ceviche', image: '/latam/poet.jpg', region: Region.LATAM }
];

const africaItems: GameItem[] = [
  { id: 'africa-1', type: 'lion', image: '/africa/dami.jpg', region: Region.AFRICA },
  { id: 'africa-2', type: 'drum', image: '/africa/defidevrel.jpg', region: Region.AFRICA },
  { id: 'africa-3', type: 'mask', image: '/africa/iamcharis.jpg', region: Region.AFRICA },
  { id: 'africa-4', type: 'baobab', image: '/africa/kcpele.jpg', region: Region.AFRICA },
  { id: 'africa-5', type: 'zebra', image: '/africa/kokocodes.jpg', region: Region.AFRICA },
  { id: 'africa-6', type: 'giraffe', image: '/africa/njokuscript.jpg', region: Region.AFRICA }
];

const southeastAsiaItems: GameItem[] = [
  { id: 'sea-1', type: 'padthai', image: '/southeast-asia/aneri.jpg', region: Region.SOUTHEAST_ASIA },
  { id: 'sea-2', type: 'satay', image: '/southeast-asia/bobby.jpg', region: Region.SOUTHEAST_ASIA },
  { id: 'sea-3', type: 'boba', image: '/southeast-asia/dami.jpg', region: Region.SOUTHEAST_ASIA },
  { id: 'sea-4', type: 'springroll', image: '/southeast-asia/jacob.jpg', region: Region.SOUTHEAST_ASIA },
  { id: 'sea-5', type: 'curry', image: '/southeast-asia/jesse.jpg', region: Region.SOUTHEAST_ASIA },
  { id: 'sea-6', type: 'noodle', image: '/southeast-asia/nabu.jpg', region: Region.SOUTHEAST_ASIA }
];

const indiaItems: GameItem[] = [
  { id: 'india-1', type: 'jalebi', image: '/india/akhil.jpg', region: Region.INDIA },
  { id: 'india-2', type: 'chai', image: '/india/gayatri.jpg', region: Region.INDIA },
  { id: 'india-3', type: 'samosa', image: '/india/kabir.jpg', region: Region.INDIA },
  { id: 'india-4', type: 'biryani', image: '/india/saxenasaheb.jpg', region: Region.INDIA },
  // Using some items from other regions to have enough variety
  { id: 'india-5', type: 'naan', image: '/southeast-asia/statuette.jpg', region: Region.INDIA },
  { id: 'india-6', type: 'curry', image: '/africa/yele.jpg', region: Region.INDIA }
];

// Define power-ups
export const powerUps = {
  [PowerUpType.ROW_CLEAR]: {
    type: PowerUpType.ROW_CLEAR,
    icon: '↔️',
    description: 'Clears an entire row'
  },
  [PowerUpType.COLUMN_CLEAR]: {
    type: PowerUpType.COLUMN_CLEAR,
    icon: '↕️',
    description: 'Clears an entire column'
  },
  [PowerUpType.AREA_CLEAR]: {
    type: PowerUpType.AREA_CLEAR,
    icon: '💥',
    description: 'Clears a 3x3 area'
  },
  [PowerUpType.EXTRA_TIME]: {
    type: PowerUpType.EXTRA_TIME,
    icon: '⏱️',
    description: 'Adds 15 seconds to the timer'
  },
  [PowerUpType.SCORE_MULTIPLIER]: {
    type: PowerUpType.SCORE_MULTIPLIER,
    icon: '✖️',
    description: 'Doubles points for 30 seconds'
  }
};

// Define level configurations
export const levels: LevelConfig[] = [
  {
    region: Region.LATAM,
    gridSize: { rows: 8, cols: 8 },
    targetScore: 1000,
    timeLimit: 120,
    items: latamItems
  },
  {
    region: Region.AFRICA,
    gridSize: { rows: 8, cols: 8 },
    targetScore: 2000,
    timeLimit: 120,
    items: africaItems
  },
  {
    region: Region.SOUTHEAST_ASIA,
    gridSize: { rows: 9, cols: 9 },
    targetScore: 3000,
    timeLimit: 150,
    items: southeastAsiaItems
  },
  {
    region: Region.INDIA,
    gridSize: { rows: 10, cols: 10 },
    targetScore: 5000,
    timeLimit: 180,
    items: indiaItems
  }
];

// Get level by index
export const getLevel = (levelIndex: number): LevelConfig => {
  if (levelIndex < 0 || levelIndex >= levels.length) {
    return levels[0]; // Default to first level if out of bounds
  }
  return levels[levelIndex];
};

// Get all items for a specific region
export const getItemsByRegion = (region: Region): GameItem[] => {
  switch (region) {
    case Region.LATAM:
      return latamItems;
    case Region.AFRICA:
      return africaItems;
    case Region.SOUTHEAST_ASIA:
      return southeastAsiaItems;
    case Region.INDIA:
      return indiaItems;
    default:
      return latamItems;
  }
};
