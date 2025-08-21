'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '../utils/soundManager';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    {
      title: "🌍 Welcome to Around the World!",
      content: (
        <div className="space-y-4">
          <p className="text-[var(--app-foreground)] text-center">
            Embark on a match-3 adventure across five unique regions of the world!
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-[var(--app-card-bg)] p-3 rounded-lg border border-[var(--app-card-border)]">
              <div className="text-lg mb-1">🦁 Africa</div>
              <div className="text-[var(--app-foreground-muted)]">Safari fruits</div>
            </div>
            <div className="bg-[var(--app-card-bg)] p-3 rounded-lg border border-[var(--app-card-border)]">
              <div className="text-lg mb-1">🕌 India</div>
              <div className="text-[var(--app-foreground-muted)]">Spice markets</div>
            </div>
            <div className="bg-[var(--app-card-bg)] p-3 rounded-lg border border-[var(--app-card-border)]">
              <div className="text-lg mb-1">🎉 Latin America</div>
              <div className="text-[var(--app-foreground-muted)]">Festive flavors</div>
            </div>
            <div className="bg-[var(--app-card-bg)] p-3 rounded-lg border border-[var(--app-card-border)]">
              <div className="text-lg mb-1">🏝️ Southeast Asia</div>
              <div className="text-[var(--app-foreground-muted)]">Tropical paradise</div>
            </div>
          </div>
          <div className="bg-[var(--app-card-bg)] p-3 rounded-lg border border-[var(--app-card-border)] text-center">
            <div className="text-lg mb-1">🏰 Europe</div>
            <div className="text-[var(--app-foreground-muted)]">Elegant gardens</div>
          </div>
        </div>
      )
    },
    {
      title: "🎯 How to Play",
      content: (
        <div className="space-y-4">
          <div className="bg-[var(--app-card-bg)] p-4 rounded-lg border border-[var(--app-card-border)]">
            <h4 className="font-bold mb-2 text-[var(--app-foreground)]">Basic Matching</h4>
            <div className="space-y-2 text-sm text-[var(--app-foreground-muted)]">
              <div className="flex items-center space-x-2">
                <span className="text-lg">👆</span>
                <span>Click a candy, then click an adjacent one to swap</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg">🔗</span>
                <span>Match 3 or more candies in a row or column</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚡</span>
                <span>Chain reactions create bonus points!</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[var(--app-card-bg)] p-4 rounded-lg border border-[var(--app-card-border)]">
            <h4 className="font-bold mb-2 text-[var(--app-foreground)]">Level Objectives</h4>
            <div className="space-y-2 text-sm text-[var(--app-foreground-muted)]">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🎯</span>
                <span>Reach the target score</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg">🔢</span>
                <span>Complete within move limit</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg">⭐</span>
                <span>Earn 1-3 stars based on performance</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "✨ Special Candies",
      content: (
        <div className="space-y-4">
          <div className="bg-[var(--app-card-bg)] p-4 rounded-lg border border-[var(--app-card-border)]">
            <h4 className="font-bold mb-3 text-[var(--app-foreground)]">Power-Up Candies</h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">🍭</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[var(--app-foreground)]">Striped Candy</div>
                  <div className="text-xs text-[var(--app-foreground-muted)]">Match 4 in a row → Clears entire row/column</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">🎁</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[var(--app-foreground)]">Wrapped Candy</div>
                  <div className="text-xs text-[var(--app-foreground-muted)]">L or T shape → Explodes in 3x3 area</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">💫</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[var(--app-foreground)]">Color Bomb</div>
                  <div className="text-xs text-[var(--app-foreground-muted)]">Match 5 in a row → Clears all of one color</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-[var(--app-accent)] bg-opacity-10 p-3 rounded-lg border border-[var(--app-accent)] border-opacity-30">
            <div className="text-sm text-[var(--app-foreground)]">
              <span className="font-bold">💡 Pro Tip:</span> Combine special candies for massive explosions and higher scores!
            </div>
          </div>
        </div>
      )
    },
    {
      title: "🏆 Rewards & Social Features",
      content: (
        <div className="space-y-4">
          <div className="bg-[var(--app-card-bg)] p-4 rounded-lg border border-[var(--app-card-border)]">
            <h4 className="font-bold mb-3 text-[var(--app-foreground)]">NFT Rewards</h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">🎖️</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[var(--app-foreground)]">Winner Badges</div>
                  <div className="text-xs text-[var(--app-foreground-muted)]">Mint unique NFTs for each level completed</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">💎</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[var(--app-foreground)]">Collectible Art</div>
                  <div className="text-xs text-[var(--app-foreground-muted)]">Beautiful region-themed artwork • 0.0001 ETH</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--app-card-bg)] p-4 rounded-lg border border-[var(--app-card-border)]">
            <h4 className="font-bold mb-3 text-[var(--app-foreground)]">Share Your Success</h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">🚀</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[var(--app-foreground)]">Farcaster Integration</div>
                  <div className="text-xs text-[var(--app-foreground-muted)]">Share scores and achievements with friends</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">🏆</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[var(--app-foreground)]">Leaderboard Competition</div>
                  <div className="text-xs text-[var(--app-foreground-muted)]">Climb the rankings • Compete globally</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-[var(--app-card-bg)] p-4 rounded-lg border border-[var(--app-card-border)]">
            <h4 className="font-bold mb-2 text-[var(--app-foreground)]">Connect Your Wallet</h4>
            <div className="text-sm text-[var(--app-foreground-muted)]">
              Connect your wallet to save progress, mint NFTs, and compete on leaderboards. Your achievements are permanently stored on-chain!
            </div>
          </div>
        </div>
      )
    },
    {
      title: "🎵 Audio & Settings",
      content: (
        <div className="space-y-4">
          <div className="bg-[var(--app-card-bg)] p-4 rounded-lg border border-[var(--app-card-border)]">
            <h4 className="font-bold mb-3 text-[var(--app-foreground)]">Regional Soundtracks</h4>
            <div className="text-sm text-[var(--app-foreground-muted)] mb-3">
              Each region features authentic music from its culture, creating an immersive experience as you travel the world.
            </div>
            
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <span>🥁</span>
                <span className="text-[var(--app-foreground-muted)]">Africa: Traditional drums and tribal melodies</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🎶</span>
                <span className="text-[var(--app-foreground-muted)]">India: Sitar and classical instruments</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🎺</span>
                <span className="text-[var(--app-foreground-muted)]">Latin America: Mariachi and salsa rhythms</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🎋</span>
                <span className="text-[var(--app-foreground-muted)]">Southeast Asia: Peaceful temple sounds</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🎼</span>
                <span className="text-[var(--app-foreground-muted)]">Europe: Classical orchestral compositions</span>
              </div>
            </div>
          </div>
          
          <div className="bg-[var(--app-card-bg)] p-4 rounded-lg border border-[var(--app-card-border)]">
            <h4 className="font-bold mb-2 text-[var(--app-foreground)]">Customize Your Experience</h4>
            <div className="text-sm text-[var(--app-foreground-muted)]">
              Click the ⚙️ settings icon to adjust music volume, sound effects, animations, and vibration to your preference.
            </div>
          </div>
        </div>
      )
    },
    {
      title: "🚀 Ready to Play!",
      content: (
        <div className="space-y-4 text-center">
          <div className="text-4xl mb-4">🌍✨</div>
          
          <div className="bg-[var(--app-card-bg)] p-4 rounded-lg border border-[var(--app-card-border)]">
            <h4 className="font-bold mb-3 text-[var(--app-foreground)]">Your Adventure Awaits!</h4>
            <div className="text-sm text-[var(--app-foreground-muted)] space-y-2">
              <p>You&quote;re now ready to begin your around-the-world journey!</p>
              <p>Start with Africa and work your way through each unique region.</p>
              <p>Remember: practice makes perfect, and every match brings you closer to mastery!</p>
            </div>
          </div>
          
          <div className="bg-[var(--app-accent)] bg-opacity-10 p-4 rounded-lg border border-[var(--app-accent)] border-opacity-30">
            <div className="text-sm">
              <div className="font-bold text-[var(--app-foreground)] mb-1">🎯 Quick Start Tips:</div>
              <div className="text-[var(--app-foreground-muted)] space-y-1">
                <div>• Look for 4+ matches to create special candies</div>
                <div>• Plan moves to trigger chain reactions</div>
                <div>• Connect your wallet to mint NFTs & save progress</div>
                <div>• Share your achievements on Farcaster</div>
                <div>• Compete on leaderboards for glory!</div>
              </div>
            </div>
          </div>
          
          <div className="text-lg font-bold text-[var(--app-foreground)]">
            Good luck, and happy matching! 🍀
          </div>
        </div>
      )
    }
  ];

  const handleClose = () => {
    soundManager.play('click');
    onClose();
  };

  const handleNextPage = () => {
    soundManager.play('click');
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    soundManager.play('click');
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageDot = (pageIndex: number) => {
    soundManager.play('click');
    setCurrentPage(pageIndex);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-[var(--app-card-bg)] backdrop-blur-sm rounded-xl border border-[var(--app-card-border)] shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--app-card-border)] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">ℹ️</span>
                <h2 className="text-lg font-bold text-[var(--app-foreground)]">How to Play</h2>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-[var(--app-gray)] hover:bg-[var(--app-gray-dark)] flex items-center justify-center transition-colors"
              >
                <span className="text-[var(--app-foreground)] text-lg">×</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh] no-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="text-xl font-bold text-[var(--app-foreground)] mb-4 text-center">
                    {pages[currentPage].title}
                  </h3>
                  {pages[currentPage].content}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Page Indicators */}
            <div className="p-4 border-t border-[var(--app-card-border)]">
              <div className="flex justify-center space-x-2 mb-4">
                {pages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handlePageDot(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentPage
                        ? 'bg-[var(--app-accent)]'
                        : 'bg-[var(--app-gray)]'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === 0
                      ? 'bg-[var(--app-gray)] text-[var(--app-foreground-muted)] cursor-not-allowed'
                      : 'bg-[var(--app-gray)] hover:bg-[var(--app-gray-dark)] text-[var(--app-foreground)]'
                  }`}
                >
                  Previous
                </button>

                <span className="text-sm text-[var(--app-foreground-muted)]">
                  {currentPage + 1} of {pages.length}
                </span>

                {currentPage === pages.length - 1 ? (
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg font-medium bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white transition-colors"
                  >
                    Start Playing!
                  </button>
                ) : (
                  <button
                    onClick={handleNextPage}
                    className="px-4 py-2 rounded-lg font-medium bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white transition-colors"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
