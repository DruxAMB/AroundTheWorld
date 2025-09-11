"use client";

import React, { useState, useEffect } from "react";
import { requestSpendPermission } from "@base-org/account/spend-permission";
import { getRewardDistributorAddressesClient } from "@/lib/utils/wallet-storage";
import { createBaseAccountSDK } from "@base-org/account";
import { ETH_ADDRESS, DAILY_ALLOWANCE_ETH } from "@/lib/cdp/spend-permissions";

interface SpendPermissionSetupProps {
  userAddress: string;
  onPermissionGranted: () => void;
}

export function SpendPermissionSetup({
  userAddress,
  onPermissionGranted,
}: SpendPermissionSetupProps) {
  const [dailyLimit, setDailyLimit] = useState(DAILY_ALLOWANCE_ETH); // Default ETH allowance
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [walletAddresses, setWalletAddresses] = useState<{address: string, smartAccountAddress: string} | null>(null);

  useEffect(() => {
    const loadWalletAddresses = async () => {
      try {
        const addresses = await getRewardDistributorAddressesClient();
        setWalletAddresses(addresses);
      } catch (error) {
        console.error('Failed to load wallet addresses:', error);
        setError('Failed to load wallet addresses');
      }
    };
    loadWalletAddresses();
  }, []);

  const handleSetupPermission = async () => {
    setIsLoading(true);
    setError("");

    try {
      if (!walletAddresses) {
        throw new Error('Wallet addresses not loaded');
      }

      const spenderAddress = walletAddresses.smartAccountAddress;
      const serverWalletAddress = walletAddresses.address;

      console.log("Using smart account address (spender):", spenderAddress);
      console.log("Using server wallet address:", serverWalletAddress);

      // Convert ETH to wei (18 decimals)
      const allowanceWei = BigInt(Math.floor(dailyLimit * 1e18));

      // Request spend permission from user's wallet (this requires user signature)
      console.log("Requesting spend permission from user...");
      const sdk = createBaseAccountSDK({
        appName: "AroundTheWorld Game",
      });
      const permission = await requestSpendPermission({
        account: userAddress as `0x${string}`,
        spender: walletAddresses.address as `0x${string}`,
        token: ETH_ADDRESS as `0x${string}`, // ETH on Base mainnet
        chainId: 8453, // Base mainnet
        allowance: allowanceWei, // Convert to ETH units (18 decimals)
        periodInDays: 1,
        provider: sdk.getProvider(),
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
        To enable reward distribution, you need to grant spend permissions. This allows the server
        to distribute ETH rewards from your admin wallet to players.
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="dailyLimit"
            className="block text-sm font-medium text-gray-700"
          >
            Daily Spend Permission (ETH)
          </label>
          <div className="mt-1">
            <input
              type="range"
              id="dailyLimit"
              min="0.0001"
              max="0.005"
              step="0.0001"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>$0.0001</span>
              <span className="font-medium text-blue-600">
                ${dailyLimit.toFixed(8)} ETH
              </span>
              <span>$0.005</span>
            </div>
            <div className="text-center text-xs text-gray-500 mt-1">
              Max ${Math.floor(dailyLimit / 0.0001 * 0.0001).toFixed(2)} reward pool per day
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
            : `Grant ${dailyLimit.toFixed(8)} ETH/day Spend Permission`}
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          💡 This creates a secure spend permission that allows the game to
          charge up to {dailyLimit.toFixed(8)} ETH per day from your wallet for level play.
          Gas fees are sponsored automatically.
        </p>
      </div>
    </div>
  );
}
