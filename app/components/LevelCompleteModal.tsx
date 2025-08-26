"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LEVELS as levels } from "../data/levels";
import { soundManager } from "../utils/soundManager";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import Image from "next/image";

interface LevelCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  success: boolean;
  score: number;
  levelName: string;
  onRetry?: () => void;
  onNextLevel?: () => void;
  onShare?: () => void;
}

type ModalState = 'complete' | 'nft-preview' | 'minting' | 'mint-success' | 'mint-error';

const CONTRACT_ADDRESS = "0xccc312aee3a136faacc535a2f3050c75db6c921d";
const MINT_PRICE = "0.0001"; // 0.0001 ETH

const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "levelId", "type": "uint256" }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "hasMinted",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "mintPrice",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;


export default function LevelCompleteModal({
  isOpen,
  onClose,
  success,
  score,
  levelName,
  onRetry,
  onNextLevel,
  onShare,
}: LevelCompleteModalProps) {
  const levelData = levels.find(level => level.region === levelName || level.name === levelName);
  const [modalState, setModalState] = useState<ModalState>('complete');
  const [errorMessage, setErrorMessage] = useState('');

  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, error } = useWriteContract();
  
  const { isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleMintClick = () => {
    soundManager.play('click');
    setModalState('nft-preview');
  };

  const handleMint = async () => {
    if (!address || !levelData) return;
    
    setModalState('minting');
    setErrorMessage('');
    
    try {
      // Convert level region to numeric ID for contract
      const levelIdMap: { [key: string]: number } = {
        'Africa': 1,
        'India': 2,
        'Europe': 3,
        'Latin America': 4,
        'Southeast Asia': 5
      };
      
      const numericLevelId = levelIdMap[levelData.region] || 1;
      
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'mint',
        args: [BigInt(numericLevelId)],
        value: parseEther(MINT_PRICE),
      });
    } catch (err: unknown) {
      console.error('Minting error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Transaction failed');
      setModalState('mint-error');
    }
  };

  const handleClose = () => {
    setModalState('complete');
    setErrorMessage('');
    onClose();
  };

  // Handle transaction confirmation
  React.useEffect(() => {
    if (isSuccess && modalState === 'minting') {
      setModalState('mint-success');
    }
  }, [isSuccess, modalState]);

  React.useEffect(() => {
    if (error && modalState === 'minting') {
      setErrorMessage(error.message);
      setModalState('mint-error');
    }
  }, [error, modalState]);

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-0"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="backdrop-blur-lg p-8 w-full h-full mx-0 my-0 text-center flex flex-col justify-center"
          >
            {modalState === 'complete' && success && (
              <>
                {/* Success Content */}
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">
                  Level Complete!
                </h2>
                <p className="text-[var(--app-foreground-muted)] mb-4">
                  Congratulations! You&apos;ve conquered {levelName}!
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
                      <Image
                        src={levelData.backgroundImage} 
                        alt={levelData.name}
                        className="w-16 h-16 rounded-lg mr-3 object-cover"
                        width={64}
                        height={64}
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
                      Mint NFT
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mb-4">
                  {onShare && (
                    <button
                      onClick={onShare}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                      Share Score 🚀
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
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
            )}

            {modalState === 'complete' && !success && (
              <>
                {/* Failure Content */}
                <div className="text-6xl mb-4">😔</div>
                <h2 className="text-2xl font-bold text-red-600 mb-2">
                  Level Failed
                </h2>
                <p className="text-[var(--app-foreground-muted)] mb-4">
                  Don&apos;t give up! Try again to conquer {levelName}.
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
                    onClick={handleClose}
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

            {/* NFT Preview State */}
            {modalState === 'nft-preview' && levelData && (
              <>
                <h3 className="text-2xl font-bold mb-4 text-center text-[var(--app-foreground)]">
                  Mint Your NFT
                </h3>
                <div className="text-center mb-4">
                  <Image 
                    src={levelData.backgroundImage} 
                    alt={levelData.name} 
                    className="w-48 h-48 mx-auto rounded-lg mb-4 object-cover"
                    width={192}
                    height={192}
                  />
                  <h4 className="text-lg font-semibold mb-2 text-[var(--app-foreground)]">
                    AroundTheWorld {levelData.name} Winner
                  </h4>
                  <p className="text-[var(--app-foreground-muted)] mb-4">
                    Congratulations! You&apos;ve completed the {levelData.name} level.
                  </p>
                </div>
                
                {!isConnected ? (
                  <div className="text-center">
                    <p className="text-red-500 mb-4">Wallet not connected</p>
                    <button 
                      onClick={() => setModalState('complete')}
                      className="w-full py-3 border border-[var(--app-gray)] rounded-lg hover:bg-[var(--app-gray)] text-[var(--app-foreground)]"
                    >
                      Back
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setModalState('complete')}
                      className="flex-1 py-3 border border-[var(--app-gray)] rounded-lg hover:bg-[var(--app-gray)] text-[var(--app-foreground)]"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleMint}
                      className="flex-1 py-3 bg-[var(--app-accent)] text-white rounded-lg hover:opacity-90 font-semibold"
                    >
                      Mint NFT
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Minting State */}
            {modalState === 'minting' && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--app-accent)] mx-auto mb-4"></div>
                <h3 className="text-xl font-bold mb-2 text-[var(--app-foreground)]">Minting Your NFT</h3>
                <p className="text-[var(--app-foreground-muted)] mb-4">
                  Please confirm the transaction in your wallet...
                </p>
                <div className="bg-[var(--app-gray)] rounded-lg p-3">
                  <p className="text-sm text-[var(--app-foreground)]">
                    This may take a few moments to complete
                  </p>
                </div>
              </div>
            )}

            {/* Mint Success State */}
            {modalState === 'mint-success' && (
              <div className="text-center">
                <div className="text-green-500 text-6xl mb-4">✓</div>
                <h3 className="text-xl font-bold mb-2 text-green-600">
                  Mint Successful!
                </h3>
                <p className="text-[var(--app-foreground-muted)] mb-4">
                  Your {levelName} Winner NFT has been minted successfully!
                </p>
                
                {hash && (
                  <div className="bg-[var(--app-gray)] rounded-lg p-3 mb-4">
                    <a 
                      href={`https://basescan.org/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-500 hover:underline break-all"
                    >
                      View on Basescan →
                    </a>
                  </div>
                )}
                
                <button 
                  onClick={handleClose}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Done
                </button>
              </div>
            )}

            {/* Mint Error State */}
            {modalState === 'mint-error' && (
              <div className="text-center">
                <div className="text-red-500 text-6xl mb-4">✗</div>
                <h3 className="text-xl font-bold mb-2 text-red-600">
                  Minting Failed
                </h3>
                <p className="text-[var(--app-foreground-muted)] mb-4">
                  {errorMessage || 'Something went wrong. Please try again.'}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={handleClose}
                    className="flex-1 py-3 border border-[var(--app-gray)] rounded-lg hover:bg-[var(--app-gray)] text-[var(--app-foreground)]"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => setModalState('nft-preview')}
                    className="flex-1 py-3 bg-[var(--app-accent)] text-white rounded-lg hover:opacity-90 font-semibold"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

    </>
  );
}
