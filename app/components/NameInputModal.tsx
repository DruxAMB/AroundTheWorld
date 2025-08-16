"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWalletClient } from 'wagmi';
import { soundManager } from "../utils/soundManager";
import { registerPlayer, isPlayerRegistered } from "../../lib/contract";

interface NameInputModalProps {
  isOpen: boolean;
  onNameSubmit: (name: string) => void;
  walletAddress?: string;
}

export function NameInputModal({ isOpen, onNameSubmit, walletAddress }: NameInputModalProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'checking' | 'registering' | 'success' | 'error'>('idle');
  const { data: walletClient } = useWalletClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      soundManager.play('click');
      return;
    }

    setIsSubmitting(true);
    soundManager.play('click');
    
    try {
      // First, save the player name to our database
      await onNameSubmit(name.trim());
      
      // Then try to register on-chain if wallet is connected and not already registered
      if (walletClient && walletAddress) {
        setRegistrationStatus('checking');
        
        const alreadyRegistered = await isPlayerRegistered(walletAddress as `0x${string}`);
        
        if (!alreadyRegistered) {
          setRegistrationStatus('registering');
          const success = await registerPlayer(walletClient);
          
          if (success) {
            setRegistrationStatus('success');
            soundManager.play('win'); // Success sound
          } else {
            setRegistrationStatus('error');
            console.log('On-chain registration failed, but player name was saved successfully');
          }
        } else {
          setRegistrationStatus('success');
        }
      }
      
      // Close modal after a brief delay
      setTimeout(() => {
        setIsSubmitting(false);
        setName("");
        setRegistrationStatus('idle');
      }, 1500);
      
    } catch (error) {
      console.error('Error during name submission:', error);
      setIsSubmitting(false);
      setRegistrationStatus('error');
    }
  };

  const getSuggestedNames = () => {
    if (!walletAddress) return [];
    
    // Generate some fun suggestions based on wallet address
    const suggestions = [
      `Player${walletAddress.slice(-4)}`,
      `Gamer${walletAddress.slice(-4)}`,
      `Traveler${walletAddress.slice(-4)}`,
      `Explorer${walletAddress.slice(-4)}`
    ];
    
    return suggestions;
  };

  const handleSuggestionClick = (suggestion: string) => {
    setName(suggestion);
    soundManager.play('click');
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
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[var(--app-card-bg)] rounded-xl border border-[var(--app-card-border)] shadow-2xl max-w-sm w-full">
              {/* Header */}
              <div className="p-6 text-center border-b border-[var(--app-card-border)]">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-4xl mb-3"
                >
                  🎮
                </motion.div>
                <h2 className="text-xl font-bold text-[var(--app-foreground)] mb-2">
                  Welcome to Around the World!
                </h2>
                <p className="text-sm text-[var(--app-foreground-muted)]">
                  Choose a name to appear on the leaderboard and compete with other players
                </p>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--app-foreground)] mb-2">
                    Your Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name..."
                    maxLength={20}
                    className="w-full px-3 py-2 border border-[var(--app-card-border)] rounded-lg bg-[var(--app-background)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
                    autoFocus
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-[var(--app-foreground-muted)]">
                      {registrationStatus === 'checking' && '🔍 Checking registration...'}
                      {registrationStatus === 'registering' && '⛓️ Registering on-chain...'}
                      {registrationStatus === 'success' && '✅ Registered successfully!'}
                      {registrationStatus === 'error' && '⚠️ Registration failed (name saved)'}
                      {registrationStatus === 'idle' && '2-20 characters'}
                    </span>
                    <span className="text-xs text-[var(--app-foreground-muted)]">
                      {name.length}/20
                    </span>
                  </div>
                </div>

                {/* Suggestions */}
                {getSuggestedNames().length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-[var(--app-foreground-muted)] mb-2">
                      Quick suggestions:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getSuggestedNames().map((suggestion, index) => (
                        <motion.button
                          key={suggestion}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                          className="px-3 py-1 text-xs bg-[var(--app-gray)] hover:bg-[var(--app-accent)] hover:text-white rounded-full transition-colors"
                          disabled={isSubmitting}
                        >
                          {suggestion}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={name.trim().length < 2 || isSubmitting}
                  whileHover={name.trim().length >= 2 && !isSubmitting ? { scale: 1.02 } : {}}
                  whileTap={name.trim().length >= 2 && !isSubmitting ? { scale: 0.98 } : {}}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                    name.trim().length >= 2 && !isSubmitting
                      ? 'bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Setting up...</span>
                    </div>
                  ) : (
                    "Start Playing! 🚀"
                  )}
                </motion.button>

                {/* Footer */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-[var(--app-foreground-muted)]">
                    You can change your name later in settings
                  </p>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
