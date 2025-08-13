"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundManager } from "../utils/soundManager";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GameSettings {
  soundEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  animationsEnabled: boolean;
  vibrationEnabled: boolean;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    soundVolume: 30,
    musicVolume: 15,
    animationsEnabled: true,
    vibrationEnabled: true,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('match3-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        // Apply settings to sound manager
        soundManager.setEnabled(parsed.soundEnabled);
        soundManager.setVolume(parsed.soundVolume / 100);
        soundManager.setMusicVolume(parsed.musicVolume / 100);
      } catch (e) {
        console.warn('Failed to load settings');
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: GameSettings) => {
    localStorage.setItem('match3-settings', JSON.stringify(newSettings));
    setSettings(newSettings);
    
    // Apply settings to sound manager
    soundManager.setEnabled(newSettings.soundEnabled);
    soundManager.setVolume(newSettings.soundVolume / 100);
    soundManager.setMusicVolume(newSettings.musicVolume / 100);
  };

  const handleSoundToggle = () => {
    const newSettings = { ...settings, soundEnabled: !settings.soundEnabled };
    saveSettings(newSettings);
    
    // Play test sound if enabling
    if (newSettings.soundEnabled) {
      setTimeout(() => soundManager.play('click'), 100);
    }
  };

  const handleSoundVolumeChange = (volume: number) => {
    const newSettings = { ...settings, soundVolume: volume };
    saveSettings(newSettings);
    
    // Play test sound
    if (settings.soundEnabled) {
      soundManager.play('click');
    }
  };

  const handleMusicVolumeChange = (volume: number) => {
    const newSettings = { ...settings, musicVolume: volume };
    saveSettings(newSettings);
  };

  const handleAnimationsToggle = () => {
    const newSettings = { ...settings, animationsEnabled: !settings.animationsEnabled };
    saveSettings(newSettings);
  };

  const handleVibrationToggle = () => {
    const newSettings = { ...settings, vibrationEnabled: !settings.vibrationEnabled };
    saveSettings(newSettings);
    
    // Test vibration if enabling (if supported)
    if (newSettings.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate(100);
    }
  };

  const resetSettings = () => {
    const defaultSettings: GameSettings = {
      soundEnabled: true,
      soundVolume: 30,
      musicVolume: 15,
      animationsEnabled: true,
      vibrationEnabled: true,
    };
    saveSettings(defaultSettings);
    soundManager.play('click');
  };

  const closeModal = () => {
    soundManager.play('click');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg z-40"
            onClick={closeModal}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[var(--app-card-bg)] rounded-xl border border-[var(--app-card-border)] shadow-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--app-card-border)]">
                <h2 className="text-xl font-bold text-[var(--app-foreground)]">
                  ⚙️ Settings
                </h2>
                <motion.button
                  onClick={closeModal}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg hover:bg-[var(--app-gray)] transition-colors"
                >
                  <span className="text-lg">✖️</span>
                </motion.button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-6">
                {/* Audio Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-3">
                    🔊 Audio
                  </h3>
                  
                  {/* Sound Effects Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium text-[var(--app-foreground)]">Sound Effects</div>
                      <div className="text-sm text-[var(--app-foreground-muted)]">
                        Game sounds and feedback
                      </div>
                    </div>
                    <motion.button
                      onClick={handleSoundToggle}
                      whileTap={{ scale: 0.95 }}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.soundEnabled ? 'bg-[var(--app-accent)]' : 'bg-gray-400'
                      }`}
                    >
                      <motion.div
                        animate={{ x: settings.soundEnabled ? 24 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                      />
                    </motion.button>
                  </div>

                  {/* Sound Volume */}
                  {settings.soundEnabled && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[var(--app-foreground)]">
                          Sound Volume
                        </span>
                        <span className="text-sm text-[var(--app-foreground-muted)]">
                          {settings.soundVolume}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.soundVolume}
                        onChange={(e) => handleSoundVolumeChange(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  )}

                  {/* Music Volume */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--app-foreground)]">
                        Music Volume
                      </span>
                      <span className="text-sm text-[var(--app-foreground-muted)]">
                        {settings.musicVolume}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={settings.musicVolume}
                      onChange={(e) => handleMusicVolumeChange(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>

                {/* Visual Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-3">
                    ✨ Visual
                  </h3>
                  
                  {/* Animations Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium text-[var(--app-foreground)]">Animations</div>
                      <div className="text-sm text-[var(--app-foreground-muted)]">
                        Smooth transitions and effects
                      </div>
                    </div>
                    <motion.button
                      onClick={handleAnimationsToggle}
                      whileTap={{ scale: 0.95 }}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.animationsEnabled ? 'bg-[var(--app-accent)]' : 'bg-gray-400'
                      }`}
                    >
                      <motion.div
                        animate={{ x: settings.animationsEnabled ? 24 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                      />
                    </motion.button>
                  </div>
                </div>

                {/* Haptic Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-3">
                    📳 Haptic
                  </h3>
                  
                  {/* Vibration Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium text-[var(--app-foreground)]">Vibration</div>
                      <div className="text-sm text-[var(--app-foreground-muted)]">
                        Haptic feedback on actions
                      </div>
                    </div>
                    <motion.button
                      onClick={handleVibrationToggle}
                      whileTap={{ scale: 0.95 }}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.vibrationEnabled ? 'bg-[var(--app-accent)]' : 'bg-gray-400'
                      }`}
                    >
                      <motion.div
                        animate={{ x: settings.vibrationEnabled ? 24 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                      />
                    </motion.button>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-[var(--app-card-border)]">
                  <motion.button
                    onClick={resetSettings}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-4 py-2 bg-[var(--app-gray)] text-[var(--app-foreground)] rounded-lg hover:bg-[var(--app-gray-dark)] transition-colors font-medium"
                  >
                    🔄 Reset to Defaults
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
