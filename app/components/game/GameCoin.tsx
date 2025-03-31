"use client";

import * as React from "react";
import { createCoinCall } from "@zoralabs/coins-sdk";
import { getCoinCreateFromLogs } from "@zoralabs/coins-sdk";
import { Address } from "viem";
import { useWriteContract, useSimulateContract, useSwitchChain, useChainId } from "wagmi";
import { base } from "wagmi/chains";
import { playSound } from "../../utils/sound";

interface GameCoinProps {
  playerAddress?: `0x${string}`;
  onCoinCreated?: (coinAddress: string) => void;
}

const GameCoin: React.FC<GameCoinProps> = ({ playerAddress, onCoinCreated }) => {
  const [coinAddress, setCoinAddress] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [needsChainSwitch, setNeedsChainSwitch] = React.useState(false);

  // Check if we're on the correct chain (Base)
  React.useEffect(() => {
    if (currentChainId !== base.id) {
      setNeedsChainSwitch(true);
      console.log(`Wrong chain detected. Current: ${currentChainId}, Expected: ${base.id} (Base)`);
    } else {
      setNeedsChainSwitch(false);
      console.log("Connected to Base chain correctly");
    }
  }, [currentChainId]);

  // Log player address for debugging
  React.useEffect(() => {
    console.log("Current player address:", playerAddress);
  }, [playerAddress]);

  // Define coin parameters for Around The World game token
  const coinParams = {
    name: "Around The World Token",
    symbol: "ATW",
    uri: "ipfs://bafkreiedwy5jqodx7tec3xtb6jzkrxpyrorzdduls7skr7is6s4ks4jkgu", // metadata URI
    payoutRecipient: playerAddress || "0x434d6c335a1739f6d18362Dd13B282930aBbdCDe" as Address, // Default to druxamb.base.eth if no player address
    platformReferrer: "0x434d6c335a1739f6d18362Dd13B282930aBbdCDe" as Address, // Optional platform referrer
  };

  // Log coin parameters for debugging
  React.useEffect(() => {
    console.log("Coin parameters:", {
      ...coinParams,
      payoutRecipient: coinParams.payoutRecipient.toString(),
      platformReferrer: coinParams.platformReferrer.toString()
    });
  }, [coinParams.payoutRecipient]);

  // Create configuration for wagmi
  const contractCallParams = createCoinCall(coinParams);

  // Simulate contract call
  const { data: writeConfig, error: simulateError } = useSimulateContract({
    ...contractCallParams,
    chainId: base.id,
  });

  // Log simulation results
  React.useEffect(() => {
    if (simulateError) {
      console.error("Simulation error:", simulateError);
    }
    if (writeConfig) {
      console.log("Write config available:", !!writeConfig);
    }
  }, [writeConfig, simulateError]);

  // Setup contract write
  const { writeContract, status, data: txHash, error: writeError } = useWriteContract();

  // Handle chain switching
  const handleSwitchChain = () => {
    try {
      switchChain({ chainId: base.id });
    } catch (err) {
      console.error("Error switching chain:", err);
      setError("Failed to switch to Base network. Please switch manually in your wallet.");
    }
  };

  // Handle coin creation
  const handleCreateCoin = () => {
    if (!playerAddress) {
      setError("Please connect your wallet first");
      return;
    }

    // Check if we need to switch chains first
    if (currentChainId !== base.id) {
      handleSwitchChain();
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
    console.log("Transaction status:", status);
    if (status === 'success' && txHash) {
      console.log("Transaction successful:", txHash);
      // In a real implementation, you would wait for the transaction receipt
      // and extract the coin address using getCoinCreateFromLogs
      // For demo purposes, we'll simulate this with a timeout
      setTimeout(() => {
        const mockCoinAddress = `0x${Array.from({length: 40}, () => 
          Math.floor(Math.random() * 16).toString(16)).join('')}`;
        
        console.log("Generated mock coin address:", mockCoinAddress);
        setCoinAddress(mockCoinAddress);
        setIsCreating(false);
        
        if (onCoinCreated) {
          onCoinCreated(mockCoinAddress);
        }
        
        playSound('reward');
      }, 2000);
    } else if (status === 'pending') {
      // Transaction is pending
      console.log("Transaction pending:", txHash);
    } else if (status === 'error') {
      console.error("Transaction error details:", {
        error: writeError,
        message: writeError?.message,
        name: writeError?.name,
        stack: writeError?.stack
      });
      setError(`Transaction failed: ${writeError?.message || "Unknown error"}`);
      setIsCreating(false);
      playSound('transactionFailure');
    }
  }, [status, txHash, onCoinCreated, writeError]);

  return (
    <div className="game-coin p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4">Around The World Token</h3>
      
      {error && (
        <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {needsChainSwitch && (
        <div className="chain-switch-message bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p>You need to switch to the Base network to create tokens.</p>
          <button 
            onClick={handleSwitchChain}
            className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded transition-colors"
          >
            Switch to Base
          </button>
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
