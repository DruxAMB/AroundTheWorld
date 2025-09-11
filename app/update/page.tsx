'use client';

import { useState, useEffect } from 'react';
import BroadcastNotifications from '@/app/components/BroadcastNotifications';
import RewardCalculator from '@/app/components/RewardCalculator';
import LeaderboardReset from '@/app/components/LeaderboardReset';
import PinAuth from '@/app/components/PinAuth';
import RewardDistributionPanel from '@/app/components/RewardDistributionPanel';
import { SpendPermissionSetup } from '@/app/components/SpendPermissionSetup';

export default function AdminPage() {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminAddress, setAdminAddress] = useState<string>('');
  
  // Check for existing authentication on mount
  useEffect(() => {
    const storedAuth = sessionStorage.getItem('adminAuthenticated');
    const authTime = parseInt(sessionStorage.getItem('adminAuthTime') || '0');
    const currentTime = Date.now();
    
    // Authentication expires after 30 minutes
    const isAuthValid = storedAuth === 'true' && (currentTime - authTime) < 30 * 60 * 1000;
    
    if (isAuthValid) {
      setIsAuthenticated(true);
    }
  }, []);
  
  // Handle successful PIN authentication
  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };
  
  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminAuthTime');
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🎮 AroundTheWorld Admin</h1>
          <p className="text-gray-600">Manage game notifications and announcements</p>
        </div>
        
        {!isAuthenticated ? (
          <PinAuth onAuthenticated={handleAuthenticated} />
        ) : (
          <>
            {/* Admin Tools Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Admin Tools</h2>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded-md hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setIsCalculatorOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  🧮 Reward Calculator
                </button>
              </div>
            </div>
            
            {/* Reward Distribution Panel */}
            <div className="mb-8">
              <RewardDistributionPanel 
                onAdminConnect={(address: string) => setAdminAddress(address)}
              />
            </div>

            {/* Spend Permission Setup */}
            {adminAddress && (
              <div className="mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">🔐 Spend Permission Setup</h3>
                  <p className="text-gray-600 mb-4">
                    Grant spend permission to enable automated reward distribution from your admin wallet.
                  </p>
                  <SpendPermissionSetup 
                    userAddress={adminAddress}
                    onPermissionGranted={() => {
                      console.log('Spend permission granted successfully');
                      // Refresh the page or update state as needed
                    }}
                  />
                </div>
              </div>
            )}

            {/* Leaderboard Reset Tool */}
            <div className="mb-8">
              <LeaderboardReset />
            </div>
            
            <BroadcastNotifications />
          </>
        )}
        {/* Reward Calculator Modal */}
        <RewardCalculator 
          isOpen={isCalculatorOpen} 
          onClose={() => setIsCalculatorOpen(false)} 
        />
      </div>
    </div>
  );
}
