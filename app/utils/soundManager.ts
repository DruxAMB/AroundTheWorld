// Sound Manager for Match-3 Game
class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private music: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.3; // Lower volume for better UX
  private musicVolume: number = 0.15; // Lower volume for background music
  private currentMusic: HTMLAudioElement | null = null;

  constructor() {
    this.preloadSounds();
    this.preloadMusic();
  }

  private preloadSounds() {
    // Only preload sounds in browser environment
    if (typeof window === 'undefined') return;

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
      try {
        const audio = new Audio(path);
        audio.volume = this.volume;
        audio.preload = 'auto';
        this.sounds.set(key, audio);
      } catch (error) {
        console.warn(`Failed to preload sound: ${key}`, error);
      }
    });
  }

  private preloadMusic() {
    // Only preload music in browser environment
    if (typeof window === 'undefined') return;

    const musicFiles = {
      menu: '/sounds/music/menu-music.mp3',
      africa: '/sounds/music/africa-music.mp3',
      india: '/sounds/music/india-music.mp3',
      latam: '/sounds/music/latam-music.mp3',
      southeastAsia: '/sounds/music/southeast-asia-music.mp3',
      europe: '/sounds/music/menu-music.mp3', // Fallback to menu music
    };

    Object.entries(musicFiles).forEach(([key, path]) => {
      try {
        const audio = new Audio(path);
        audio.volume = this.musicVolume;
        audio.loop = true;
        audio.preload = 'auto';
        this.music.set(key, audio);
      } catch (error) {
        console.warn(`Failed to preload music: ${key}`, error);
      }
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

  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.music.forEach(music => {
      music.volume = this.musicVolume;
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopMusic();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  playMusic(musicName: string) {
    if (!this.enabled) return;

    // Stop current music if playing
    this.stopMusic();

    const music = this.music.get(musicName);
    if (music) {
      music.currentTime = 0;
      music.play().catch(() => {
        // Ignore errors (e.g., if user hasn't interacted with page yet)
      });
      this.currentMusic = music;
    }
  }

  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
      this.currentMusic = null;
    }
  }

  fadeOutMusic(duration: number = 1000) {
    if (!this.currentMusic) return;

    const music = this.currentMusic;
    const startVolume = music.volume;
    const fadeStep = startVolume / (duration / 50);

    const fadeInterval = setInterval(() => {
      if (music.volume > fadeStep) {
        music.volume -= fadeStep;
      } else {
        music.volume = 0;
        music.pause();
        music.currentTime = 0;
        music.volume = this.musicVolume; // Reset volume for next play
        clearInterval(fadeInterval);
        if (this.currentMusic === music) {
          this.currentMusic = null;
        }
      }
    }, 50);
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
