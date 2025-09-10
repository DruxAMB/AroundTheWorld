'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { requestUserSpendPermission, getUserSpendPermissions } from '../../lib/cdp/spend-permissions';

interface LevelPlayChargingProps {
  userAddress: string;
  levelName?: string;
  levelCost?: number;
  onPermissionGranted?: (permission: any) => void;
  onChargeLevel?: (levelId: string) => void;
  onChargeSuccess?: () => void;
  onCancel?: () => void;
}

interface PendingCharge {
  levelId: string;
  levelName: string;
  amount: number;
  timestamp: Date;
}

export default function LevelPlayCharging({ 
  userAddress, 
  levelName,
  levelCost = 0.04,
  onPermissionGranted, 
  onChargeLevel,
  onChargeSuccess,
  onCancel
}: LevelPlayChargingProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isGrantingPermission, setIsGrantingPermission] = useState(false);
  const [pendingCharges, setPendingCharges] = useState<PendingCharge[]>([]);
  const [spenderAddress, setSpenderAddress] = useState<string>('');
  const [permissionStatus, setPermissionStatus] = useState<{
    remainingAllowance: number;
    levelsRemaining: number;
  }>({ remainingAllowance: 0.2, levelsRemaining: 5 });

  const LEVEL_COST = 0.04; // $0.04 per level
  const DAILY_ALLOWANCE = 0.2; // $0.2 daily allowance

  useEffect(() => {
    loadSpendPermissionStatus();
    loadPendingCharges();
  }, [userAddress]);

  const loadSpendPermissionStatus = async () => {
    if (!userAddress) return;

    try {
      console.log('🔍 Loading spend permission status...');
      
      // Get the reward distributor wallet address via API
      const walletResponse = await fetch('/api/wallet/create', {
        method: 'POST',
      });
      
      if (!walletResponse.ok) {
        throw new Error('Failed to get server wallet address');
      }
      
      const walletData = await walletResponse.json();
      const spenderAddr = walletData.smartAccountAddress;
      setSpenderAddress(spenderAddr);
      
      console.log('🏦 Spender address:', spenderAddr);
      
      const permissions = await getUserSpendPermissions(userAddress, spenderAddr);
      
      if (permissions.length > 0) {
        setHasPermission(true);
        // Calculate remaining allowance based on pending charges
        const totalPending = pendingCharges.reduce((sum, charge) => sum + charge.amount, 0);
        const remaining = DAILY_ALLOWANCE - totalPending;
        setPermissionStatus({
          remainingAllowance: Math.max(0, remaining),
          levelsRemaining: Math.floor(remaining / LEVEL_COST)
        });
      } else {
        setHasPermission(false);
      }
    } catch (error) {
      console.error('Failed to load spend permission status:', error);
      setHasPermission(false);
    }
  };

  const loadPendingCharges = () => {
    try {
      const stored = localStorage.getItem(`pending_charges_${userAddress}`);
      if (stored) {
        const charges = JSON.parse(stored).map((charge: any) => ({
          ...charge,
          timestamp: new Date(charge.timestamp)
        }));
        
        // Filter out charges older than 24 hours
        const now = new Date();
        const validCharges = charges.filter((charge: PendingCharge) => 
          (now.getTime() - charge.timestamp.getTime()) < 24 * 60 * 60 * 1000
        );
        
        setPendingCharges(validCharges);
        
        // Update localStorage with filtered charges
        localStorage.setItem(`pending_charges_${userAddress}`, JSON.stringify(validCharges));
      }
    } catch (error) {
      console.error('Failed to load pending charges:', error);
      setPendingCharges([]);
    }
  };

  const grantSpendPermission = async () => {
    if (!userAddress) return;

    setIsGrantingPermission(true);
    try {
      // Get the reward distributor wallet address via API
      const walletResponse = await fetch('/api/wallet/create', {
        method: 'POST',
      });
      
      if (!walletResponse.ok) {
        throw new Error('Failed to get server wallet address');
      }
      
      const walletData = await walletResponse.json();
      const spenderAddr = walletData.smartAccountAddress;
      
      const permission = await requestUserSpendPermission(
        userAddress,
        spenderAddr,
        DAILY_ALLOWANCE
      );

      console.log('✅ Spend permission granted:', permission);
      setHasPermission(true);
      setPermissionStatus({
        remainingAllowance: 0.2,
        levelsRemaining: 5
      });
      
      // Notify parent component
      onPermissionGranted?.(permission);
      
      await loadSpendPermissionStatus();
      
    } catch (error) {
      console.error('❌ Failed to grant spend permission:', error);
      alert('Failed to grant spend permission. Please try again.');
    } finally {
      setIsGrantingPermission(false);
    }
  };

  const addPendingCharge = (levelId: string, levelName: string, amount: number = 0.04) => {
    const newCharge: PendingCharge = {
      levelId,
      levelName,
      amount,
      timestamp: new Date()
    };
    
    const updatedCharges = [...pendingCharges, newCharge];
    setPendingCharges(updatedCharges);
    
    // Save to localStorage
    localStorage.setItem('pendingLevelCharges', JSON.stringify(updatedCharges));
    
    console.log(`Added pending charge: $${amount} for ${levelName} (${levelId})`);
    onChargeLevel?.(levelId);
    return true;
  };

  const getTotalPendingAmount = () => {
    return pendingCharges.reduce((sum, charge) => sum + charge.amount, 0);
  };

  // Handle level play charge and proceed to game
  const handlePlayLevel = () => {
    if (!hasPermission) {
      console.log('No spend permission - cannot charge for level play');
      return;
    }

    if (levelName) {
      // Add the charge for this specific level
      addPendingCharge(`level-${Date.now()}`, levelName, levelCost);
      
      // Update remaining allowance
      const newAllowance = Math.max(0, permissionStatus.remainingAllowance - levelCost);
      const newLevelsRemaining = Math.floor(newAllowance / levelCost);
      setPermissionStatus({
        remainingAllowance: newAllowance,
        levelsRemaining: newLevelsRemaining
      });

      // Notify parent component that charging is complete
      onChargeSuccess?.();
    }
  };

  if (!userAddress) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <p className="text-yellow-800">Please connect your wallet to play levels</p>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4"
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🎮 Enable Level Play
          </h3>
          <p className="text-blue-700 mb-4">
            Grant permission to charge <strong>$0.04 per level</strong> from your wallet.
            <br />
            Daily limit: <strong>$0.20</strong> (5 levels max per day)
          </p>
          
          <div className="bg-white rounded-lg p-4 mb-4 text-left">
            <h4 className="font-medium text-gray-800 mb-2">How it works:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Each level costs $0.04 to play</li>
              <li>• Charges are batched and collected periodically</li>
              <li>• All fees go to the reward pool for top players</li>
              <li>• You can revoke permission anytime</li>
            </ul>
          </div>

          <button
            onClick={grantSpendPermission}
            disabled={isGrantingPermission}
            className={`px-6 py-3 rounded-lg font-medium text-white ${
              isGrantingPermission
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isGrantingPermission ? (
              <span className="flex items-center">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block mr-2"
                >
                  🔄
                </motion.span>
                Granting Permission...
              </span>
            ) : (
              'Grant Spend Permission'
            )}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-green-900">✅ Level Play Enabled</h3>
          <p className="text-sm text-green-700">
            ${permissionStatus.remainingAllowance.toFixed(2)} remaining • {permissionStatus.levelsRemaining} levels left today
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-green-800">$0.04 per level</p>
        </div>
      </div>

      {pendingCharges.length > 0 && (
        <div className="bg-white rounded-lg p-3 mb-3">
          <h4 className="font-medium text-gray-800 mb-2">
            Pending Charges: ${getTotalPendingAmount().toFixed(2)}
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {pendingCharges.map((charge, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">{charge.levelName}</span>
                <span className="font-medium">${charge.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Charges will be collected automatically
          </p>
        </div>
      )}

      {/* Level-specific charging interface */}
      {levelName && (
        <div className="bg-white rounded-lg p-4 mb-3 border-2 border-blue-200">
          <h4 className="font-semibold text-gray-800 mb-2">
            🎮 Ready to play: {levelName}
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            This level will cost <strong>${levelCost.toFixed(2)}</strong> to play.
            You have ${permissionStatus.remainingAllowance.toFixed(2)} remaining today.
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={handlePlayLevel}
              disabled={permissionStatus.remainingAllowance < levelCost}
              className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                permissionStatus.remainingAllowance >= levelCost
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {permissionStatus.remainingAllowance >= levelCost ? (
                `Play Level ($${levelCost.toFixed(2)})`
              ) : (
                'Insufficient Allowance'
              )}
            </button>
            
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-green-600">
        <span>Spender: {spenderAddress.slice(0, 8)}...{spenderAddress.slice(-6)}</span>
        <button 
          onClick={loadSpendPermissionStatus}
          className="hover:text-green-800"
        >
          🔄 Refresh
        </button>
      </div>
    </motion.div>
  );

  // Expose the addPendingCharge function for external use
  (window as any).addLevelCharge = addPendingCharge;
}
