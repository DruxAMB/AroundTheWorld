"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NFTMintModal from "./NFTMintModal";

interface LevelCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  success: boolean;
  score: number;
  levelId: number;
  levelName: string;
  onRetry?: () => void;
  onNextLevel?: () => void;
}

// Level data mapping
const LEVEL_DATA = {
  1: {
    name: "Africa",
    imageUrl: "https://peach-obvious-bobcat-804.mypinata.cloud/ipfs/bafkreidb4wmluqgxeblpsbet7xf27jjukc76jsxov54orjen45zf7knkbm"
  },
  2: {
    name: "India", 
    imageUrl: "https://peach-obvious-bobcat-804.mypinata.cloud/ipfs/bafkreia5oursimw7d4ur3u55qqrhjk3bgpnpvzy7nqtbr6m2o6aqnvzmnu"
  },
  3: {
    name: "Europe",
    imageUrl: "https://peach-obvious-bobcat-804.mypinata.cloud/ipfs/bafkreieoeivcfrg4qzdjaufmmgjsdbrhsmbyx247nmgq3jx4keil26flmi"
  },
  4: {
    name: "LatAm",
    imageUrl: "https://peach-obvious-bobcat-804.mypinata.cloud/ipfs/bafkreiah3x2ghjk4ipoknd24ellpplfvimoxrikagp6o2djuokcflrj6um"
  },
  5: {
    name: "Southeast Asia",
    imageUrl: "https://peach-obvious-bobcat-804.mypinata.cloud/ipfs/bafkreickfq2kng34bbinihugvz3us6qepvfydazs7i72zc4z6s5rn3j5ze"
  }
};

export default function LevelCompleteModal({
  isOpen,
  onClose,
  success,
  score,
  levelId,
  levelName,
  onRetry,
  onNextLevel
}: LevelCompleteModalProps) {
  const [showMintModal, setShowMintModal] = useState(false);

  const levelData = LEVEL_DATA[levelId as keyof typeof LEVEL_DATA];

  const handleMintClick = () => {
    setShowMintModal(true);
  };

  const handleMintModalClose = () => {
    setShowMintModal(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[var(--app-background)] border border-[var(--app-gray)] rounded-xl p-8 max-w-md w-full mx-4 text-center"
          >
            {success ? (
              <>
                {/* Success Content */}
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">
                  Level Complete!
                </h2>
                <p className="text-[var(--app-foreground-muted)] mb-4">
                  Congratulations! You've conquered {levelName}!
                </p>
                
                <div className="bg-[var(--app-gray)] rounded-lg p-4 mb-6">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {score.toLocaleString()}
                  </div>
                  <div className="text-sm text-[var(--app-foreground-muted)]">Final Score</div>
                </div>

                {/* NFT Mint Section */}
                {levelData && (
                  <div className="bg-[var(--app-gray)] rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-center mb-3">
                      <img 
                        src={levelData.imageUrl} 
                        alt={levelData.name}
                        className="w-16 h-16 rounded-lg mr-3 object-cover"
                      />
                      <div className="text-left">
                        <div className="font-semibold text-[var(--app-foreground)]">
                          Claim Your NFT
                        </div>
                        <div className="text-sm text-[var(--app-foreground-muted)]">
                          {levelData.name} Winner Badge
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleMintClick}
                      className="w-full py-3 bg-[var(--app-accent)] text-white rounded-lg hover:opacity-90 font-semibold transition-opacity"
                    >
                      Mint NFT (~$0.20)
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 border border-[var(--app-gray)] rounded-lg hover:bg-[var(--app-gray)] text-[var(--app-foreground)] font-semibold"
                  >
                    Back to Levels
                  </button>
                  {onNextLevel && (
                    <button
                      onClick={onNextLevel}
                      className="flex-1 py-3 bg-[var(--app-accent)] text-white rounded-lg hover:opacity-90 font-semibold"
                    >
                      Next Level
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Failure Content */}
                <div className="text-6xl mb-4">😔</div>
                <h2 className="text-2xl font-bold text-red-600 mb-2">
                  Level Failed
                </h2>
                <p className="text-[var(--app-foreground-muted)] mb-4">
                  Don't give up! Try again to conquer {levelName}.
                </p>
                
                <div className="bg-[var(--app-gray)] rounded-lg p-4 mb-6">
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {score.toLocaleString()}
                  </div>
                  <div className="text-sm text-[var(--app-foreground-muted)]">Final Score</div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 border border-[var(--app-gray)] rounded-lg hover:bg-[var(--app-gray)] text-[var(--app-foreground)] font-semibold"
                  >
                    Back to Levels
                  </button>
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      className="flex-1 py-3 bg-[var(--app-accent)] text-white rounded-lg hover:opacity-90 font-semibold"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* NFT Mint Modal */}
      {levelData && (
        <NFTMintModal
          isOpen={showMintModal}
          onClose={handleMintModalClose}
          levelId={levelId}
          levelName={levelData.name}
          imageUrl={levelData.imageUrl}
        />
      )}
    </>
  );
}
