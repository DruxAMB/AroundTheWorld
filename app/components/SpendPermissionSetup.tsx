"use client";

import React, { useState } from "react";
import { requestSpendPermission } from "@base-org/account/spend-permission";
import { createBaseAccountSDK } from "@base-org/account";

interface SpendPermissionSetupProps {
  userAddress: string;
  onPermissionGranted: () => void;
}

export function SpendPermissionSetup({
  userAddress,
  onPermissionGranted,
}: SpendPermissionSetupProps) {
  const [weeklyLimit, setWeeklyLimit] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSetupPermission = async () => {
    setIsLoading(true);
    setError("");

    try {
      // First create server wallet to get the spender address
      const walletResponse = await fetch("/api/wallet/create", {
        method: "POST",
      });

      if (!walletResponse.ok) {
        throw new Error("Failed to create server wallet");
      }

      const walletData = await walletResponse.json();
      const spenderAddress = walletData.smartAccountAddress;

      if (!spenderAddress) {
        throw new Error("Smart account address not found");
      }

      console.log("Smart account address (spender):", spenderAddress);
      console.log("Server wallet address:", walletData.address);

      // USDC address on Base mainnet
      const USDC_BASE_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

      // Convert USD to USDC (6 decimals)
      const allowanceUSDC = BigInt(weeklyLimit * 1_000_000);

      // Request spend permission from user's wallet (this requires user signature)
      console.log("Requesting spend permission from user...");
      const permission = await requestSpendPermission({
        account: userAddress as `0x${string}`,
        spender: spenderAddress as `0x${string}`,
        token: USDC_BASE_ADDRESS as `0x${string}`,
        chainId: 84532, // Base mainnet
        allowance: allowanceUSDC,
        periodInDays: 7, // Weekly limit
        provider: createBaseAccountSDK({
          appName: "AroundTheWorld Game",
        }).getProvider(),
      });

      console.log("Spend permission granted:", permission);

      // Store the permission for later use
      localStorage.setItem("spendPermission", JSON.stringify(permission));
      
      onPermissionGranted();
    } catch (error) {
      console.error("Permission setup error:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Set Up Spend Permissions
      </h3>

      <p className="text-gray-600 text-sm mb-6">
        Grant spend permissions for weekly reward distribution. This allows the AI agent to 
        pull USDC from your wallet and distribute rewards to players automatically.
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="weeklyLimit"
            className="block text-sm font-medium text-gray-700"
          >
            Weekly Spend Permission (USD)
          </label>
          <div className="mt-1">
            <input
              type="range"
              id="weeklyLimit"
              min="1"
              max="20"
              step="1"
              value={weeklyLimit}
              onChange={(e) => setWeeklyLimit(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>$1.00</span>
              <span className="font-medium text-blue-600">${weeklyLimit.toFixed(2)}</span>
              <span>$20.00</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleSetupPermission}
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading
            ? "Setting up..."
            : `Grant $${weeklyLimit.toFixed(2)}/week Spend Permission`}
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          💡 This creates a secure spend permission that allows the agent to
          spend up to ${weeklyLimit.toFixed(2)} per week from your wallet for reward distribution.
          Gas fees are sponsored automatically.
        </p>
      </div>
    </div>
  );
}
