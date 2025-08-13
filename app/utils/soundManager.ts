// Sound Manager for Match-3 Game
class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.3; // Lower volume for better UX

  constructor() {
    this.preloadSounds();
  }

  private preloadSounds() {
    const soundFiles = {
      click: '/sounds/click.mp3',
      match: '/sounds/match.mp3',
      combo2: '/sounds/combo2.mp3',
      combo3: '/sounds/combo3.mp3',
      combo4: '/sounds/combo4.mp3',
      powerUp: '/sounds/power-up.mp3',
      rowClear: '/sounds/row-clear.mp3',
      columnClear: '/sounds/column-clear.mp3',
      areaClear: '/sounds/area-clear.mp3',
      gameOver: '/sounds/game-over.mp3',
      win: '/sounds/win.mp3',
      shuffle: '/sounds/shuffle.mp3',
    };

    Object.entries(soundFiles).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.volume = this.volume;
      audio.preload = 'auto';
      this.sounds.set(key, audio);
    });
  }

  play(soundName: string) {
    if (!this.enabled) return;

    const sound = this.sounds.get(soundName);
    if (sound) {
      // Reset to beginning and play
      sound.currentTime = 0;
      sound.play().catch(() => {
        // Ignore errors (e.g., if user hasn't interacted with page yet)
      });
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Play appropriate sound based on match size
  playMatchSound(matchSize: number) {
    if (matchSize >= 6) {
      this.play('combo4');
    } else if (matchSize >= 5) {
      this.play('combo3');
    } else if (matchSize >= 4) {
      this.play('combo2');
    } else {
      this.play('match');
    }
  }

  // Play special candy activation sound
  playSpecialSound(candyType: string) {
    switch (candyType) {
      case '🟦': // Horizontal striped
        this.play('rowClear');
        break;
      case '🟨': // Vertical striped
        this.play('columnClear');
        break;
      case '🟪': // Wrapped
        this.play('areaClear');
        break;
      case '⚫': // Color bomb
        this.play('powerUp');
        break;
      default:
        this.play('match');
    }
  }
}

// Create singleton instance
export const soundManager = new SoundManager();
