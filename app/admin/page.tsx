'use client';

import { useState } from 'react';
import BroadcastNotifications from '@/app/components/BroadcastNotifications';
import RewardCalculator from '@/app/components/RewardCalculator';

export default function AdminPage() {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🎮 AroundTheWorld Admin</h1>
          <p className="text-gray-600">Manage game notifications and announcements</p>
        </div>
        
        {/* Admin Tools Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Admin Tools</h2>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setIsCalculatorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              🧮 Reward Calculator
            </button>
          </div>
        </div>
        
        <BroadcastNotifications />
        
        {/* Reward Calculator Modal */}
        <RewardCalculator 
          isOpen={isCalculatorOpen} 
          onClose={() => setIsCalculatorOpen(false)} 
        />
      </div>
    </div>
  );
}
