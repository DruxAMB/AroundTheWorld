'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { motion } from 'framer-motion';
import { 
  requestUserSpendPermission, 
  getUserSpendPermissions, 
  revokeSpendPermission,
  checkSpendPermissionStatus 
} from '@/lib/spend-permissions';

// Get reward distributor address from server wallet
let REWARD_DISTRIBUTOR_ADDRESS = "0x0000000000000000000000000000000000000000";

// Fetch the actual server wallet address on component mount
const fetchServerWalletAddress = async () => {
  try {
    const response = await fetch('/api/rewards/distribute');
    if (response.ok) {
      const data = await response.json();
      // The server will return the wallet address in the response
      return data.serverWalletAddress;
    }
  } catch (error) {
    console.error('Failed to fetch server wallet address:', error);
  }
  return null;
};

interface SpendPermissionUI {
  id: string;
  allowance: string;
  period: number;
  start: number;
  end: number;
  isActive: boolean;
  remainingSpend?: string;
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

  const [allowanceAmount, setAllowanceAmount] = useState('0.01');
  const [duration, setDuration] = useState(30); // days
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<SpendPermissionUI[]>([]);
  const [serverWalletAddress, setServerWalletAddress] = useState<string>('');
  const [showGrantForm, setShowGrantForm] = useState(false);

  // Load server wallet address and permissions
  useEffect(() => {
    const initializeComponent = async () => {
      const walletAddr = await fetchServerWalletAddress();
      if (walletAddr) {
        setServerWalletAddress(walletAddr);
        REWARD_DISTRIBUTOR_ADDRESS = walletAddr;
      }
      
      if (address && walletAddr) {
        loadPermissions();
      }
    };
    
    initializeComponent();
  }, [address]);

  const loadPermissions = async () => {
    if (!address || !serverWalletAddress) return;
    
    try {
      const rawPermissions = await getUserSpendPermissions(address, serverWalletAddress);
      
      const formattedPermissions: SpendPermissionUI[] = [];
      
      for (const rawPerm of rawPermissions) {
        try {
          const status = await checkSpendPermissionStatus(rawPerm);
          
          formattedPermissions.push({
            id: `${rawPerm.permission?.account}-${rawPerm.permission?.spender}` || 'unknown',
            allowance: formatEther(BigInt(rawPerm.permission?.allowance || '0')),
            period: rawPerm.permission?.period || 1,
            start: 0, // Will be set by the permission system
            end: 0,   // Will be set by the permission system
            isActive: status.isActive,
            remainingSpend: formatEther(status.remainingSpend || BigInt(0))
          });
        } catch (statusError) {
          console.error('Failed to get status for permission:', statusError);
        }
      }
      
      setPermissions(formattedPermissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const handleGrantPermission = async () => {
    if (!address || !isConnected || !serverWalletAddress) return;

    setIsLoading(true);
    try {
      await requestUserSpendPermission(
        address,
        serverWalletAddress,
        parseFloat(allowanceAmount)
      );
      
      // Reload permissions after successful grant
      setTimeout(() => {
        loadPermissions();
        setIsLoading(false);
        setShowGrantForm(false);
      }, 2000); // Give time for transaction to be processed
    } catch (err) {
      console.error('Failed to grant permission:', err);
      setIsLoading(false);
    }
  };

  const handleRevokePermission = async (permission: SpendPermissionUI) => {
    if (!address || !isConnected) return;

    try {
      // Find the original permission object
      const rawPermissions = await getUserSpendPermissions(address, serverWalletAddress);
      const targetPermission = rawPermissions.find(p => 
        `${p.permission?.account}-${p.permission?.spender}` === permission.id
      );
      
      if (targetPermission) {
        await revokeSpendPermission(targetPermission.permission);
        
        // Reload permissions after successful revoke
        setTimeout(() => {
          loadPermissions();
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to revoke permission:', err);
    }
  };

  // Handle permission granted callback
  const handlePermissionGranted = (permissionId: string) => {
    if (onPermissionGranted) {
      onPermissionGranted(permissionId);
    }
  };

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
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md font-medium text-white ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block mr-2"
                >
                  🔄
                </motion.span>
                'Granting Permission...'
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
                  <p className="font-medium">{permission.allowance} ETH/day</p>
                  <p className="text-sm text-gray-500">
                    Status: {permission.isActive ? 'Active' : 'Inactive'}
                  </p>
                  {permission.remainingSpend && (
                    <p className="text-sm text-blue-600">
                      Remaining: {permission.remainingSpend} ETH
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRevokePermission(permission)}
                  className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
