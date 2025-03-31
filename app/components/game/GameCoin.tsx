"use client";

import * as React from "react";
import { createCoinCall } from "@zoralabs/coins-sdk";
import { getCoinCreateFromLogs } from "@zoralabs/coins-sdk";
import { Address } from "viem";
import { useWriteContract, useSimulateContract } from "wagmi";
import { playSound } from "../../utils/sound";

interface GameCoinProps {
  playerAddress?: `0x${string}`;
  onCoinCreated?: (coinAddress: string) => void;
}

const GameCoin: React.FC<GameCoinProps> = ({ playerAddress, onCoinCreated }) => {
  const [coinAddress, setCoinAddress] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Define coin parameters for Around The World game token
  const coinParams = {
    name: "Around The World Token",
    symbol: "ATW",
    uri: "ipfs://bafybeigoxzqzbnxsn35vq7lls3ljxdcwjafxvbvkivprsodzrptpiguysy", // Replace with your actual metadata URI
    payoutRecipient: playerAddress || "0x434d6c335a1739f6d18362Dd13B282930aBbdCDe" as Address, // Default to druxamb.base.eth if no player address
    platformReferrer: "0x434d6c335a1739f6d18362Dd13B282930aBbdCDe" as Address, // Optional platform referrer
  };

  // Create configuration for wagmi
  const contractCallParams = createCoinCall(coinParams);

  // Simulate contract call
  const { data: writeConfig, error: simulateError } = useSimulateContract({
    ...contractCallParams,
  });

  // Setup contract write
  const { writeContract, status, data: txHash, error: writeError } = useWriteContract();

  // Handle coin creation
  const handleCreateCoin = () => {
    if (!playerAddress) {
      setError("Please connect your wallet first");
      return;
    }

    setIsCreating(true);
    setError(null);
    
    try {
      playSound('transactionSuccess');
      if (writeConfig?.request) {
        writeContract(writeConfig.request);
      } else {
        setError("Failed to prepare transaction. Please try again.");
        playSound('transactionFailure');
        setIsCreating(false);
      }
    } catch (err) {
      console.error("Error creating coin:", err);
      setError("Failed to create coin. Please try again.");
      playSound('transactionFailure');
      setIsCreating(false);
    }
  };

  // Watch for transaction status changes
  React.useEffect(() => {
    if (status === 'success' && txHash) {
      // In a real implementation, you would wait for the transaction receipt
      // and extract the coin address using getCoinCreateFromLogs
      // For demo purposes, we'll simulate this with a timeout
      setTimeout(() => {
        const mockCoinAddress = `0x${Array.from({length: 40}, () => 
          Math.floor(Math.random() * 16).toString(16)).join('')}`;
        
        setCoinAddress(mockCoinAddress);
        setIsCreating(false);
        
        if (onCoinCreated) {
          onCoinCreated(mockCoinAddress);
        }
        
        playSound('reward');
      }, 2000);
    } else if (status === 'error') {
      setError("Transaction failed. Please try again.");
      setIsCreating(false);
      playSound('transactionFailure');
    }
  }, [status, txHash, onCoinCreated]);

  return (
    <div className="game-coin p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4">Around The World Token</h3>
      
      {error && (
        <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {coinAddress ? (
        <div className="success-message bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Token Created!</p>
          <p className="text-sm break-all">{coinAddress}</p>
          <p className="mt-2">You can now use your Around The World tokens to unlock special features and trade with other players.</p>
        </div>
      ) : (
        <div className="coin-info mb-4">
          <p className="mb-2">Create your own Around The World token to:</p>
          <ul className="list-disc pl-5 mb-4">
            <li>Unlock exclusive game features</li>
            <li>Trade with other players</li>
            <li>Earn rewards for achievements</li>
          </ul>
          
          <button 
            onClick={handleCreateCoin}
            disabled={isCreating || !playerAddress || !writeConfig}
            className={`w-full py-2 rounded-lg transition-colors ${
              isCreating || !playerAddress || !writeConfig
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isCreating ? 'Creating Token...' : 'Create Game Token'}
          </button>
          
          {!playerAddress && (
            <p className="text-sm text-gray-500 mt-2">Connect your wallet to create a token</p>
          )}
        </div>
      )}
    </div>
  );
};

export default GameCoin;
