"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";

interface NFTMintModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelId: number;
  levelName: string;
  imageUrl: string;
}

const CONTRACT_ADDRESS = "0xccc312aee3a136faacc535a2f3050c75db6c921d";
const MINT_PRICE = "0.0002"; // 0.0002 ETH

const CONTRACT_ABI = [
  {
    inputs: [{ name: "levelId", type: "uint256" }],
    name: "mint",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" }
    ],
    name: "hasMinted",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  }
] as const;

export default function NFTMintModal({ 
  isOpen, 
  onClose, 
  levelId, 
  levelName, 
  imageUrl 
}: NFTMintModalProps) {
  const [status, setStatus] = useState<'preview' | 'minting' | 'success' | 'error'>('preview');
  const [errorMessage, setErrorMessage] = useState('');

  const { context } = useMiniKit();
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleMint = async () => {
    if (!isConnected || !address) {
      setErrorMessage('Wallet not connected');
      setStatus('error');
      return;
    }

    try {
      setStatus('minting');
      setErrorMessage('');

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'mint',
        args: [BigInt(levelId)],
        value: parseEther(MINT_PRICE),
      });
    } catch (err: any) {
      console.error('Minting error:', err);
      setErrorMessage(err.message || 'Failed to mint NFT');
      setStatus('error');
    }
  };

  // Update status based on transaction state
  if (isConfirming && status !== 'minting') {
    setStatus('minting');
  }
  
  if (isSuccess && status !== 'success') {
    setStatus('success');
  }

  if (error && status !== 'error') {
    setErrorMessage(error.message);
    setStatus('error');
  }

  const handleClose = () => {
    setStatus('preview');
    setErrorMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {status === 'preview' && (
            <div>
              <h3 className="text-2xl font-bold mb-4 text-center">
                Mint Your NFT
              </h3>
              <div className="text-center mb-4">
                <img 
                  src={imageUrl} 
                  alt={levelName} 
                  className="w-48 h-48 mx-auto rounded-lg mb-4 object-cover"
                />
                <h4 className="text-lg font-semibold mb-2">
                  AroundTheWorld {levelName} Winner
                </h4>
                <p className="text-gray-600 mb-4">
                  Congratulations! You've completed the {levelName} level.
                </p>
                <div className="bg-gray-100 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>Mint Price:</strong> {MINT_PRICE} ETH (~$0.20)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    + Base network gas fees
                  </p>
                </div>
              </div>
              
              {!isConnected ? (
                <div className="text-center">
                  <p className="text-red-500 mb-4">Wallet not connected</p>
                  <button 
                    onClick={handleClose}
                    className="w-full py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button 
                    onClick={handleClose}
                    className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleMint}
                    className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                  >
                    Mint NFT
                  </button>
                </div>
              )}
            </div>
          )}

          {status === 'minting' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-bold mb-2">Minting Your NFT</h3>
              <p className="text-gray-600 mb-4">
                Please confirm the transaction in your wallet...
              </p>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  This may take a few moments to complete
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="text-green-500 text-6xl mb-4">✓</div>
              <h3 className="text-xl font-bold mb-2 text-green-600">
                Mint Successful!
              </h3>
              <p className="text-gray-600 mb-4">
                Your {levelName} Winner NFT has been minted successfully!
              </p>
              
              {hash && (
                <div className="bg-green-50 rounded-lg p-3 mb-4">
                  <a 
                    href={`https://basescan.org/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 hover:underline break-all"
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

          {status === 'error' && (
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">✗</div>
              <h3 className="text-xl font-bold mb-2 text-red-600">
                Minting Failed
              </h3>
              <p className="text-gray-600 mb-4">
                {errorMessage || 'Something went wrong. Please try again.'}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={handleClose}
                  className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button 
                  onClick={() => setStatus('preview')}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
