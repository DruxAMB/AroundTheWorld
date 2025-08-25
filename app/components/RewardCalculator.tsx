'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RewardDistributionService } from '@/lib/reward-distribution';

export default function RewardCalculator({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [rewardPool, setRewardPool] = useState<string>('30');
  const [rewardSymbol, setRewardSymbol] = useState<string>('ETH');

  // Calculate rewards whenever the pool amount changes
  const rewardDistribution = RewardDistributionService.calculateRewardDistribution(parseFloat(rewardPool) * 1e18);

  const handleRewardPoolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty input or valid numbers
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
      setRewardPool(value);
    }
  };

  // Function to format currency with commas
  const formatCurrency = (value: number | string): string => {
    if (typeof value === 'string') {
      value = parseFloat(value);
    }
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-x-0 top-20 mx-auto max-w-2xl z-50 p-4"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <span>🧮</span>
                  <span>Reward Calculator</span>
                </h2>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <span className="text-xl">✖️</span>
                </button>
              </div>
              
              <div className="p-5">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Reward Pool
                  </label>
                  <div className="flex space-x-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={rewardPool}
                        onChange={handleRewardPoolChange}
                        className="w-full text-black border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter amount"
                      />
                    </div>
                    <div className="w-24">
                      <select
                        value={rewardSymbol}
                        onChange={(e) => setRewardSymbol(e.target.value)}
                        className="w-full text-black border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ETH">ETH</option>
                        <option value="USDC">USDC</option>
                        <option value="BASE">BASE</option>
                        <option value="$">$</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-800 mb-4">Reward Distribution</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rank
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tier
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Percentage
                          </th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rewardDistribution.distributions.map((item) => (
                          <tr key={item.rank} className={item.rank <= 3 ? 'bg-blue-50' : ''}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                {item.rank === 1 && <span>🥇</span>}
                                {item.rank === 2 && <span>🥈</span>}
                                {item.rank === 3 && <span>🥉</span>}
                                {item.rank}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-700 capitalize">
                                {item.tier}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-700">
                                {item.percentage}%
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {RewardDistributionService.formatRewardAmount(item.amount)} {rewardSymbol}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between">
                <div className="text-sm text-gray-600">
                  Total Pool: <span className="font-medium">{formatCurrency(rewardPool)} {rewardSymbol}</span>
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
