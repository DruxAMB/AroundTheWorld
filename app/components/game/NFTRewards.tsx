"use client";

import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../../utils/gameTypes';
import { playSound } from '../../utils/sound';
import Image from 'next/image';

interface NFTRewardsProps {
  playerAddress?: `0x${string}`;
  leaderboard: LeaderboardEntry[];
}

interface NFTReward {
  rank: number;
  address: `0x${string}`;
  score: number;
  region: string;
  imageUrl: string;
  claimed: boolean;
}

const NFTRewards: React.FC<NFTRewardsProps> = ({ playerAddress, leaderboard }) => {
  const [rewards, setRewards] = useState<NFTReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<NFTReward | null>(null);

  // Fetch NFT rewards data
  useEffect(() => {
    const fetchRewards = async () => {
      try {
        setIsLoading(true);
        
        // In a real implementation, you would fetch this data from your backend
        // For this example, we'll create mock data based on the leaderboard
        
        // Sort the leaderboard by score (highest first)
        const sortedLeaderboard = [...leaderboard].sort((a, b) => b.score - a.score);
        
        // Get the top 3 players
        const topPlayers = sortedLeaderboard.slice(0, 3);
        
        // Create mock NFT rewards
        const mockRewards: NFTReward[] = topPlayers.map((player, index) => {
          const rank = index + 1;
          const regionNames = {
            0: 'Latin America',
            1: 'Africa',
            2: 'Southeast Asia',
            3: 'India',
          };
          
          const regionName = regionNames[player.level as keyof typeof regionNames] || 'Global';
          
          return {
            rank,
            address: player.address,
            score: player.score,
            region: regionName,
            imageUrl: `/images/nft-rewards/rank-${rank}.png`,
            claimed: Math.random() > 0.5, // Randomly set claimed status for demo
          };
        });
        
        setRewards(mockRewards);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching NFT rewards:', error);
        setIsLoading(false);
      }
    };
    
    fetchRewards();
  }, [leaderboard]);

  // Handle claiming an NFT reward
  const handleClaimReward = async (reward: NFTReward) => {
    try {
      // Play claim sound
      playSound('reward');
      
      // Set the selected reward and show the claim modal
      setSelectedReward(reward);
      setShowClaimModal(true);
      
      // In a real implementation, you would call your backend to claim the NFT
      console.log('Claiming NFT reward:', reward);
      
      // Simulate claiming delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the reward as claimed
      setRewards(prevRewards => 
        prevRewards.map(r => 
          r.rank === reward.rank ? { ...r, claimed: true } : r
        )
      );
      
      // Hide the claim modal after a delay
      setTimeout(() => {
        setShowClaimModal(false);
        setSelectedReward(null);
      }, 3000);
    } catch (error) {
      console.error('Error claiming NFT reward:', error);
      setShowClaimModal(false);
      setSelectedReward(null);
    }
  };

  return (
    <div className="nft-rewards mt-8">
      <h3 className="text-xl font-bold mb-4 text-center">Weekly NFT Rewards</h3>
      
      {isLoading ? (
        <div className="loading-state text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p>Loading rewards...</p>
        </div>
      ) : rewards.length === 0 ? (
        <div className="empty-state text-center py-4 text-gray-500">
          <p>No NFT rewards available yet.</p>
        </div>
      ) : (
        <div className="rewards-grid grid grid-cols-1 md:grid-cols-3 gap-4">
          {rewards.map((reward) => {
            const isPlayer = playerAddress && reward.address.toLowerCase() === playerAddress.toLowerCase();
            const canClaim = isPlayer && !reward.claimed;
            
            return (
              <div 
                key={reward.rank}
                className={`reward-card p-4 rounded-lg shadow-md ${
                  isPlayer ? 'bg-blue-50 border border-blue-200' : 'bg-white'
                }`}
              >
                <div className="relative w-full aspect-square mb-3">
                  <Image
                    src={reward.imageUrl}
                    alt={`Rank ${reward.rank} NFT`}
                    width={200}
                    height={200}
                    className="rounded-md object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-md text-sm">
                    Rank #{reward.rank}
                  </div>
                </div>
                
                <div className="reward-details">
                  <h4 className="font-bold text-lg mb-1">
                    {reward.rank === 1 ? '🥇 Champion' : 
                     reward.rank === 2 ? '🥈 Runner-Up' : 
                     reward.rank === 3 ? '🥉 Third Place' : `#${reward.rank}`}
                  </h4>
                  <p className="text-sm text-gray-600 mb-1">
                    Region: {reward.region}
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Score: {reward.score.toLocaleString()}
                  </p>
                  
                  {canClaim ? (
                    <button
                      onClick={() => handleClaimReward(reward)}
                      className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Claim NFT
                    </button>
                  ) : (
                    <div className={`w-full py-2 text-center rounded-md ${
                      reward.claimed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {reward.claimed ? 'Claimed' : 'Not Eligible'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Claim Modal */}
      {showClaimModal && selectedReward && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full text-center">
            <h3 className="text-xl font-bold mb-4">Claiming NFT Reward</h3>
            
            <div className="relative w-40 h-40 mx-auto mb-4">
              <Image
                src={selectedReward.imageUrl}
                alt={`Rank ${selectedReward.rank} NFT`}
                fill
                className="object-cover rounded-md"
              />
            </div>
            
            <p className="mb-4">
              {selectedReward.claimed ? (
                <span className="text-green-600 font-medium">
                  NFT successfully claimed! Check your wallet.
                </span>
              ) : (
                <span className="text-gray-600">
                  Processing your claim...
                  <span className="inline-block animate-pulse ml-1">•••</span>
                </span>
              )}
            </p>
            
            <button
              onClick={() => {
                playSound('click');
                setShowClaimModal(false);
                setSelectedReward(null);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              disabled={!selectedReward.claimed}
            >
              {selectedReward.claimed ? 'Close' : 'Please Wait...'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NFTRewards;
