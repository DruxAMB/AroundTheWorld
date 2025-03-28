import { Howl } from 'howler';

// Sound effects for game interactions
const sounds = {
  match: new Howl({
    src: ['/sounds/match.mp3'],
    volume: 0.7
  }),
  slash: new Howl({
    src: ['/sounds/slash.mp3'],
    volume: 0.5
  }),
  win: new Howl({
    src: ['/sounds/win.mp3'],
    volume: 1.0
  }),
  levelComplete: new Howl({
    src: ['/sounds/level-complete.mp3'],
    volume: 1.0
  }),
  powerUp: new Howl({
    src: ['/sounds/power-up.mp3'],
    volume: 0.8
  }),
  gameOver: new Howl({
    src: ['/sounds/game-over.mp3'],
    volume: 1.0
  })
};

// Play a sound effect
export const playSound = (soundName: keyof typeof sounds): void => {
  sounds[soundName].play();
};

// Stop a sound effect
export const stopSound = (soundName: keyof typeof sounds): void => {
  sounds[soundName].stop();
};

// Mute/unmute all sounds
export const setMute = (muted: boolean): void => {
  Howler.mute(muted);
};

export default sounds;
