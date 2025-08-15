"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundManager } from "../utils/soundManager";
import { useGameData } from "../hooks/useGameData";

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
  const { settings, saveSettings: saveGameSettings } = useGameData();
  
  // Default settings - only used if no Redis data exists
  const defaultSettings: GameSettings = {
    soundEnabled: true,
    soundVolume: 30,
    musicVolume: 15,
    animationsEnabled: true,
    vibrationEnabled: true,
  };

  // Initialize with null to indicate loading state
  const [localSettings, setLocalSettings] = useState<GameSettings | null>(null);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  // Debounce timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings from Redis via useGameData hook
  useEffect(() => {
    if (settings && typeof settings === 'object' && Object.keys(settings).length > 0 && settings.soundEnabled !== undefined) {
      // Use Redis settings - always update when we get valid settings
      setLocalSettings(settings);
      setIsSettingsLoaded(true);
      // Apply settings to sound manager
      soundManager.setEnabled(settings.soundEnabled);
      soundManager.setVolume(settings.soundVolume / 100);
      soundManager.setMusicVolume(settings.musicVolume / 100);
    } else if (settings === null && !isSettingsLoaded) {
      // No Redis settings found, use defaults
      setLocalSettings(defaultSettings);
      setIsSettingsLoaded(true);
      // Apply default settings to sound manager
      soundManager.setEnabled(defaultSettings.soundEnabled);
      soundManager.setVolume(defaultSettings.soundVolume / 100);
      soundManager.setMusicVolume(defaultSettings.musicVolume / 100);
    }
  }, [settings, defaultSettings, isSettingsLoaded]);

  // Debounced save to Redis (500ms delay)
  const debouncedSaveToRedis = useCallback((newSettings: GameSettings) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for Redis save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveGameSettings(newSettings);
      } catch (error) {
        console.error('Failed to save settings to Redis:', error);
      }
    }, 500);
  }, [saveGameSettings]);

  // Update settings immediately (for responsive UI) + debounced Redis save
  const updateSettings = useCallback((newSettings: GameSettings) => {
    // 1. Update UI immediately
    setLocalSettings(newSettings);
    
    // 2. Apply settings to sound manager immediately
    soundManager.setEnabled(newSettings.soundEnabled);
    soundManager.setVolume(newSettings.soundVolume / 100);
    soundManager.setMusicVolume(newSettings.musicVolume / 100);
    
    // 3. Save to Redis with debounce
    debouncedSaveToRedis(newSettings);
  }, [debouncedSaveToRedis]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleSoundToggle = () => {
    if (!localSettings) return;
    const newSettings = { ...localSettings, soundEnabled: !localSettings.soundEnabled };
    updateSettings(newSettings);
    
    // Play test sound if enabling
    if (newSettings.soundEnabled) {
      setTimeout(() => soundManager.play('click'), 100);
    }
  };

  const handleSoundVolumeChange = (volume: number) => {
    if (!localSettings) return;
    const newSettings = { ...localSettings, soundVolume: volume };
    updateSettings(newSettings);
    
    // Play test sound
    if (localSettings.soundEnabled) {
      soundManager.play('click');
    }
  };

  const handleMusicVolumeChange = (volume: number) => {
    if (!localSettings) return;
    const newSettings = { ...localSettings, musicVolume: volume };
    updateSettings(newSettings);
  };

  const handleAnimationsToggle = () => {
    if (!localSettings) return;
    const newSettings = { ...localSettings, animationsEnabled: !localSettings.animationsEnabled };
    updateSettings(newSettings);
  };

  const handleVibrationToggle = () => {
    if (!localSettings) return;
    const newSettings = { ...localSettings, vibrationEnabled: !localSettings.vibrationEnabled };
    updateSettings(newSettings);
    
    // Test vibration if enabling (if supported)
    if (newSettings.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate(100);
    }
  };

  const resetSettings = () => {
    updateSettings(defaultSettings);
    soundManager.play('click');
  };

  const closeModal = () => {
    soundManager.play('click');
    onClose();
  };

  // Show loading state while settings are loading
  if (!localSettings) {
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
            
            {/* Loading Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-[var(--app-card-bg)] rounded-xl border border-[var(--app-card-border)] shadow-2xl max-w-sm w-full p-8 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 mx-auto mb-4"
                >⚙️</motion.div>
                <div className="text-[var(--app-foreground)]">Loading settings...</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

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
            className="no-scrollbar fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="no-scrollbar bg-[var(--app-card-bg)] rounded-xl border border-[var(--app-card-border)] shadow-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto">
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
                        localSettings.soundEnabled ? 'bg-[var(--app-accent)]' : 'bg-gray-400'
                      }`}
                    >
                      <motion.div
                        animate={{ x: localSettings.soundEnabled ? 24 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md"
                      />
                    </motion.button>
                  </div>

                  {/* Sound Volume */}
                  {localSettings.soundEnabled && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[var(--app-foreground)]">
                          Sound Volume
                        </span>
                        <span className="text-sm text-[var(--app-foreground-muted)]">
                          {localSettings.soundVolume}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={localSettings.soundVolume}
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
                        {localSettings.musicVolume}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={localSettings.musicVolume}
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
                        localSettings.animationsEnabled ? 'bg-[var(--app-accent)]' : 'bg-gray-400'
                      }`}
                    >
                      <motion.div
                        animate={{ x: localSettings.animationsEnabled ? 24 : 0 }}
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
                        localSettings.vibrationEnabled ? 'bg-[var(--app-accent)]' : 'bg-gray-400'
                      }`}
                    >
                      <motion.div
                        animate={{ x: localSettings.vibrationEnabled ? 24 : 0 }}
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
