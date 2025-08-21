// Level system for Around the World Match-3 Game

export interface LevelObjective {
  type: 'score' | 'moves' | 'clear_special' | 'collect_items';
  target: number;
  description: string;
}

export interface Level {
  id: string;
  name: string;
  region: string;
  description: string;
  backgroundImage: string;
  backgroundMusic: string;
  candyTheme: string[];
  specialCandies: string[];
  objectives: LevelObjective[];
  moves: number;
  difficulty: 'easy' | 'medium' | 'hard';
  unlocked: boolean;
}

export const REGIONAL_CANDY_THEMES = {
  africa: [
    '/africa/derick.jpg',
    '/africa/dami.jpg', 
    '/africa/basedeastafrica.jpg',
    '/africa/basedsouthernafrica.jpg',
    '/africa/basedwestafrica.jpg',
    '/africa/basedzambia.jpg'
  ],
  india: [
    '/india/akhil.jpg',
    '/india/dacoit.jpg',
    '/india/gayatri.jpg',
    '/india/kabir.jpg',
    '/india/mentalist.jpg',
    '/india/saxenasaheb.jpg'
  ],
  latam: [
    '/latam/basedlatam.jpg',
    '/latam/basedturkiye.jpg',
    '/latam/carlos.jpg',
    '/latam/juampi.jpg',
    '/latam/junkie.jpg',
    '/latam/simon.jpg'
  ],
  southeastAsia: [
    '/southeast-asia/basedjapan.jpg',
    '/southeast-asia/basedkorea.jpg',
    '/southeast-asia/basesg.jpg',
    '/southeast-asia/basevietnam.jpg',
    '/southeast-asia/kinjo.jpg',
    '/southeast-asia/nibel.jpg'
  ],
  europe: [
    '/europe/basedbrazil.jpg',
    '/europe/basedgermany.jpg',
    '/europe/basedindonisea.jpg',
    '/europe/basedireland.jpg',
    '/europe/baseduk.jpg',
    '/europe/slatt.jpg'
  ]
};

export const LEVELS: Level[] = [
  {
    id: 'africa-1',
    name: 'African Safari',
    region: 'Africa',
    description: 'Welcome to Africa! Match tropical fruits to score points.',
    backgroundImage: '/africa.jpg',
    backgroundMusic: 'africa',
    candyTheme: REGIONAL_CANDY_THEMES.africa,
    specialCandies: ['🦁', '🐘', '🦒', '🦓'], // African animals as special candies
    objectives: [
      {
        type: 'score',
        target: 1000,
        description: 'Score 1,000 points'
      }
    ],
    moves: 25,
    difficulty: 'easy',
    unlocked: true,
  },
  {
    id: 'india-1',
    name: 'Spice Market',
    region: 'India',
    description: 'Explore the vibrant spice markets of India!',
    backgroundImage: '/india.jpg',
    backgroundMusic: 'india',
    candyTheme: REGIONAL_CANDY_THEMES.india,
    specialCandies: ['🐅', '🦚', '🐘', '🕉️'], // Indian cultural symbols
    objectives: [
      {
        type: 'score',
        target: 1500,
        description: 'Score 1,500 points'
      },
      {
        type: 'clear_special',
        target: 2,
        description: 'Create 2 special candies'
      }
    ],
    moves: 20,
    difficulty: 'medium',
    unlocked: false,
  },
  {
    id: 'latam-1',
    name: 'Fiesta Time',
    region: 'Latin America',
    description: 'Join the celebration with Latin American flavors!',
    backgroundImage: '/latam.jpg',
    backgroundMusic: 'latam',
    candyTheme: REGIONAL_CANDY_THEMES.latam,
    specialCandies: ['🦜', '🌺', '🎭', '⚽'], // Latin American symbols
    objectives: [
      {
        type: 'score',
        target: 2000,
        description: 'Score 2,000 points'
      },
      {
        type: 'moves',
        target: 15,
        description: 'Complete in 15 moves or less'
      }
    ],
    moves: 18,
    difficulty: 'medium',
    unlocked: false,
  },
  {
    id: 'southeast-asia-1',
    name: 'Tropical Paradise',
    region: 'Southeast Asia',
    description: 'Discover the exotic fruits of Southeast Asia!',
    backgroundImage: '/southeastasia.jpg',
    backgroundMusic: 'southeastAsia',
    candyTheme: REGIONAL_CANDY_THEMES.southeastAsia,
    specialCandies: ['🐉', '🦋', '🌸', '🏯'], // Southeast Asian symbols
    objectives: [
      {
        type: 'score',
        target: 2500,
        description: 'Score 2,500 points'
      },
      {
        type: 'clear_special',
        target: 4,
        description: 'Create 4 special candies'
      }
    ],
    moves: 15,
    difficulty: 'hard',
    unlocked: false,
  },
  {
    id: 'europe-1',
    name: 'European Garden',
    region: 'Europe',
    description: 'Complete your journey through European orchards!',
    backgroundImage: '/around-the-world.jpg',
    backgroundMusic: 'europe',
    candyTheme: REGIONAL_CANDY_THEMES.europe,
    specialCandies: ['🏰', '🦢', '🌹', '👑'], // European symbols
    objectives: [
      {
        type: 'score',
        target: 3000,
        description: 'Score 3,000 points'
      },
      {
        type: 'moves',
        target: 12,
        description: 'Complete in 12 moves or less'
      },
      {
        type: 'clear_special',
        target: 5,
        description: 'Create 7 special candies'
      }
    ],
    moves: 12,
    difficulty: 'hard',
    unlocked: false,
  },
];

// Level progression logic
export const unlockNextLevel = (completedLevelId: string): string | null => {
  const currentIndex = LEVELS.findIndex(level => level.id === completedLevelId);
  if (currentIndex >= 0 && currentIndex < LEVELS.length - 1) {
    return LEVELS[currentIndex + 1].id;
  }
  return null;
};

export const getLevelById = (id: string): Level | undefined => {
  return LEVELS.find(level => level.id === id);
};

export const getUnlockedLevels = (): Level[] => {
  return LEVELS.filter(level => level.unlocked);
};

export const checkLevelObjectives = (
  level: Level, 
  gameState: { score: number; moves: number; specialCandiesCreated: number },
  isGameWon: boolean = false
): { completed: boolean; progress: { [key: string]: boolean } } => {
  const progress: { [key: string]: boolean } = {};
  let allCompleted = true;

  level.objectives.forEach((objective, index) => {
    let completed = false;
    
    switch (objective.type) {
      case 'score':
        completed = gameState.score >= objective.target;
        break;
      case 'moves':
        // Only consider completed if game is won and moves used <= target
        const movesUsed = level.moves - gameState.moves;
        completed = isGameWon && movesUsed <= objective.target;
        break;
      case 'clear_special':
        completed = gameState.specialCandiesCreated >= objective.target;
        break;
    }
    
    progress[`objective_${index}`] = completed;
    if (!completed) allCompleted = false;
  });

  return { completed: allCompleted, progress };
};
