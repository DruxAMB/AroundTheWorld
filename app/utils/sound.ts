import { Howl, Howler } from 'howler';
import { Region } from './gameTypes';

// Sound effects for game interactions
const soundEffects = {
  // UI Sounds
  click: new Howl({
    src: ['/sounds/click.mp3'],
    volume: 0.5
  }),
  
  // Game Mechanics Sounds
  match: new Howl({
    src: ['/sounds/match.mp3'],
    volume: 0.7
  }),
  slash: new Howl({
    src: ['/sounds/slash.mp3'],
    volume: 0.5
  }),
  shuffle: new Howl({
    src: ['/sounds/shuffle.mp3'],
    volume: 0.6
  }),
  
  // Combo Sounds
  combo2: new Howl({
    src: ['/sounds/combo2.mp3'],
    volume: 0.6
  }),
  combo3: new Howl({
    src: ['/sounds/combo3.mp3'],
    volume: 0.7
  }),
  combo4: new Howl({
    src: ['/sounds/combo4.mp3'],
    volume: 0.8
  }),
  
  // Power-up Sounds
  powerUp: new Howl({
    src: ['/sounds/power-up.mp3'],
    volume: 0.8
  }),
  rowClear: new Howl({
    src: ['/sounds/row-clear.mp3'],
    volume: 0.8
  }),
  columnClear: new Howl({
    src: ['/sounds/column-clear.mp3'],
    volume: 0.8
  }),
  areaClear: new Howl({
    src: ['/sounds/area-clear.mp3'],
    volume: 0.8
  }),
  
  // Game State Sounds
  levelComplete: new Howl({
    src: ['/sounds/level-complete.mp3'],
    volume: 1.0
  }),
  win: new Howl({
    src: ['/sounds/win.mp3'],
    volume: 1.0
  }),
  gameOver: new Howl({
    src: ['/sounds/game-over.mp3'],
    volume: 1.0
  }),
  
  // Reward Sounds
  reward: new Howl({
    src: ['/sounds/reward.mp3'],
    volume: 1.0
  }),
  
  // Wallet Interaction Sounds
  transactionSuccess: new Howl({
    src: ['/sounds/transaction-success.mp3'],
    volume: 0.8
  }),
  transactionFailure: new Howl({
    src: ['/sounds/transaction-failure.mp3'],
    volume: 0.8
  })
};

// Background music for each region
const backgroundMusic = {
  [Region.LATAM]: new Howl({
    src: ['/sounds/music/latam-music.mp3'],
    volume: 0.4,
    loop: true
  }),
  [Region.AFRICA]: new Howl({
    src: ['/sounds/music/africa-music.mp3'],
    volume: 0.4,
    loop: true
  }),
  [Region.SOUTHEAST_ASIA]: new Howl({
    src: ['/sounds/music/southeast-asia-music.mp3'],
    volume: 0.4,
    loop: true
  }),
  [Region.INDIA]: new Howl({
    src: ['/sounds/music/india-music.mp3'],
    volume: 0.4,
    loop: true
  }),
  menu: new Howl({
    src: ['/sounds/music/menu-music.mp3'],
    volume: 0.3,
    loop: true
  })
};

// Current playing background music
let currentMusic: Howl | null = null;

// Play a sound effect
export const playSound = (soundName: keyof typeof soundEffects): void => {
  soundEffects[soundName].play();
};

// Play a combo sound based on combo count
export const playComboSound = (comboCount: number): void => {
  if (comboCount >= 4) {
    playSound('combo4');
  } else if (comboCount === 3) {
    playSound('combo3');
  } else if (comboCount === 2) {
    playSound('combo2');
  }
};

// Stop a sound effect
export const stopSound = (soundName: keyof typeof soundEffects): void => {
  soundEffects[soundName].stop();
};

// Play background music for a specific region
export const playBackgroundMusic = (region: Region | 'menu'): void => {
  // Stop current music if playing
  if (currentMusic) {
    currentMusic.stop();
  }
  
  // Start new music
  currentMusic = backgroundMusic[region];
  if (currentMusic) {
    currentMusic.play();
  }
};

// Stop all background music
export const stopBackgroundMusic = (): void => {
  if (currentMusic) {
    currentMusic.stop();
    currentMusic = null;
  }
};

// Set background music volume
export const setMusicVolume = (volume: number): void => {
  // Ensure volume is between 0 and 1
  const safeVolume = Math.max(0, Math.min(1, volume));
  
  // Set volume for all background music
  Object.values(backgroundMusic).forEach(music => {
    music.volume(safeVolume);
  });
};

// Set sound effects volume
export const setSoundEffectsVolume = (volume: number): void => {
  // Ensure volume is between 0 and 1
  const safeVolume = Math.max(0, Math.min(1, volume));
  
  // Set volume for all sound effects
  Object.values(soundEffects).forEach(sound => {
    sound.volume(safeVolume);
  });
};

// Mute/unmute all sounds
export const setMute = (muted: boolean): void => {
  Howler.mute(muted);
};

// Export the sound utility functions
const soundUtils = {
  soundEffects,
  backgroundMusic,
  playSound,
  playComboSound,
  stopSound,
  playBackgroundMusic,
  stopBackgroundMusic,
  setMusicVolume,
  setSoundEffectsVolume,
  setMute
};

export default soundUtils;
