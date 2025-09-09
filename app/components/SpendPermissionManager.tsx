'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { motion } from 'framer-motion';

// Spend Permission contract ABI (simplified for Base Account SDK)
const SPEND_PERMISSION_ABI = [
  {
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "token", "type": "address" },
      { "name": "allowance", "type": "uint256" },
      { "name": "period", "type": "uint48" },
      { "name": "start", "type": "uint48" },
      { "name": "end", "type": "uint48" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bytes32" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "id", "type": "bytes32" }],
    "name": "revoke",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Reward distribution wallet address (will be set from CDP server wallet)
const REWARD_DISTRIBUTOR_ADDRESS = process.env.NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS || "0x0000000000000000000000000000000000000000";
const ETH_ADDRESS = "0x0000000000000000000000000000000000000000"; // ETH as token

interface SpendPermission {
  id: string;
  allowance: string;
  period: number;
  start: number;
  end: number;
  isActive: boolean;
}

interface SpendPermissionManagerProps {
  onPermissionGranted?: (permissionId: string) => void;
  onPermissionRevoked?: (permissionId: string) => void;
}

export default function SpendPermissionManager({ 
  onPermissionGranted, 
  onPermissionRevoked 
}: SpendPermissionManagerProps) {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, error } = useWriteContract();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const [allowanceAmount, setAllowanceAmount] = useState('0.01');
  const [duration, setDuration] = useState(30); // days
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<SpendPermission[]>([]);
  const [showGrantForm, setShowGrantForm] = useState(false);

  // Load existing permissions
  useEffect(() => {
    if (address) {
      loadPermissions();
    }
  }, [address]);

  const loadPermissions = async () => {
    try {
      const response = await fetch(`/api/spend-permissions?address=${address}`);
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const handleGrantPermission = async () => {
    if (!address || !isConnected) return;

    setIsLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const endTime = now + (duration * 24 * 60 * 60); // Convert days to seconds
      
      await writeContract({
        address: address, // User's smart account
        abi: SPEND_PERMISSION_ABI,
        functionName: 'approve',
        args: [
          REWARD_DISTRIBUTOR_ADDRESS,
          ETH_ADDRESS,
          parseEther(allowanceAmount),
          BigInt(24 * 60 * 60), // 24 hour period
          BigInt(now),
          BigInt(endTime)
        ]
      });
    } catch (err) {
      console.error('Failed to grant permission:', err);
      setIsLoading(false);
    }
  };

  const handleRevokePermission = async (permissionId: string) => {
    if (!address || !isConnected) return;

    try {
      await writeContract({
        address: address,
        abi: SPEND_PERMISSION_ABI,
        functionName: 'revoke',
        args: [permissionId as `0x${string}`]
      });
    } catch (err) {
      console.error('Failed to revoke permission:', err);
    }
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isSuccess) {
      setIsLoading(false);
      setShowGrantForm(false);
      loadPermissions();
      if (onPermissionGranted && hash) {
        onPermissionGranted(hash);
      }
    }
  }, [isSuccess, hash, onPermissionGranted]);

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">🔐 Reward Distribution Permissions</h3>
        <p className="text-gray-600">Connect your wallet to manage spend permissions for automated reward distribution.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">🔐 Reward Distribution Permissions</h3>
        <button
          onClick={() => setShowGrantForm(!showGrantForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showGrantForm ? 'Cancel' : 'Grant Permission'}
        </button>
      </div>

      <p className="text-gray-600 mb-4">
        Grant spending permissions to enable automated reward distribution from your wallet.
      </p>

      {showGrantForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border rounded-lg p-4 mb-4 bg-gray-50"
        >
          <h4 className="font-medium mb-3">Grant New Permission</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Allowance (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                value={allowanceAmount}
                onChange={(e) => setAllowanceAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (days)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>1 Week</option>
                <option value={30}>1 Month</option>
                <option value={90}>3 Months</option>
                <option value={365}>1 Year</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Summary:</strong> Allow up to {allowanceAmount} ETH per day for {duration} days 
              (Total: {(parseFloat(allowanceAmount) * duration).toFixed(4)} ETH maximum)
            </p>
          </div>

          <button
            onClick={handleGrantPermission}
            disabled={isLoading || isConfirming}
            className={`w-full py-2 px-4 rounded-md font-medium text-white ${
              isLoading || isConfirming
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isLoading || isConfirming ? (
              <span className="flex items-center justify-center">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block mr-2"
                >
                  🔄
                </motion.span>
                {isConfirming ? 'Confirming...' : 'Granting Permission...'}
              </span>
            ) : (
              'Grant Permission'
            )}
          </button>
        </motion.div>
      )}

      {/* Active Permissions */}
      <div>
        <h4 className="font-medium mb-3">Active Permissions</h4>
        {permissions.length === 0 ? (
          <p className="text-gray-500 text-sm">No active permissions</p>
        ) : (
          <div className="space-y-2">
            {permissions.map((permission) => (
              <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{formatEther(BigInt(permission.allowance))} ETH/day</p>
                  <p className="text-sm text-gray-500">
                    Expires: {new Date(permission.end * 1000).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokePermission(permission.id)}
                  className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">
            Error: {error.message}
          </p>
        </div>
      )}
    </div>
  );
}
