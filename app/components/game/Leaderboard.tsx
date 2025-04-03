"use client";

import React, { useState, useEffect } from 'react';
import { Identity, Name, Avatar } from "@coinbase/onchainkit/identity";
import { LeaderboardEntry } from '../../utils/gameTypes';
import { playSound } from '../../utils/sound';
import NFTRewards from './NFTRewards';

interface LeaderboardProps {
  playerAddress?: `0x${string}`;
}

const SCHEMA_UID = "0xdc3cf7f28b4b5255ce732cbf99fe906a5bc13fbd764e2463ba6034b4e1881835";
// const EAS_GRAPHQL_URL = "https://base.easscan.org/graphql";

const Leaderboard: React.FC<LeaderboardProps> = ({ playerAddress }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        
        // Fetch from our Redis-backed API
        const response = await fetch('/api/leaderboard?limit=10');
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("Failed to load leaderboard data");
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // State for player rank
  const [playerRank, setPlayerRank] = useState<number>(-1);
  
  // Fetch player rank
  useEffect(() => {
    const fetchPlayerRank = async () => {
      if (!playerAddress) return;
      
      try {
        const response = await fetch(`/api/user?address=${playerAddress}`);
        
        if (response.ok) {
          const data = await response.json();
          setPlayerRank(data.rank || -1);
        }
      } catch (error) {
        console.error('Error fetching player rank:', error);
      }
    };
    
    fetchPlayerRank();
  }, [playerAddress]);

  return (
    <div className="leaderboard p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Onchain Leaderboard</h2>
      
      {isLoading ? (
        <div className="loading-state text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
          <p>Loading leaderboard...</p>
        </div>
      ) : error ? (
        <div className="error-state text-center py-8 text-red-500">
          <p>{error}</p>
          <button 
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={() => {
              playSound('click');
              window.location.reload();
            }}
          >
            Retry
          </button>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="empty-state text-center py-8 text-gray-500">
          <p>No scores recorded yet. Be the first!</p>
        </div>
      ) : (
        <>
          {playerAddress && playerRank !== -1 && (
            <div className="player-rank bg-blue-50 p-3 rounded-lg mb-4 border border-blue-200">
              <p className="text-center font-medium">
                Your Rank: <span className="font-bold text-blue-600">#{playerRank}</span>
              </p>
            </div>
          )}
          
          <div className="leaderboard-table">
            <div className="leaderboard-header grid grid-cols-12 gap-2 py-2 border-b-2 border-gray-200 font-bold text-gray-600">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-6">Player</div>
              <div className="col-span-3 text-right">Score</div>
              <div className="col-span-2 text-right">Level</div>
            </div>
            
            <div className="leaderboard-body">
              {leaderboard.map((entry, index) => {
                const isPlayer = playerAddress && entry.address.toLowerCase() === playerAddress.toLowerCase();
                
                return (
                  <div 
                    key={`${entry.address}-${index}`}
                    className={`grid grid-cols-12 gap-2 py-3 border-b border-gray-100 items-center ${
                      isPlayer ? 'bg-blue-50' : index % 2 === 0 ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="col-span-1 text-center font-bold text-gray-500">
                      {index + 1}
                    </div>
                    <div className="col-span-6">
                      <Identity 
                        address={entry.address} 
                        schemaId={SCHEMA_UID}
                        className="!bg-inherit p-0 [&>div]:space-x-2"
                      >
                        <div className="flex items-center">
                          <Avatar className="w-6 h-6 rounded-full mr-2" />
                          <Name className={`text-sm ${isPlayer ? 'font-bold' : ''}`}>
                            {isPlayer ? 'You' : null}
                          </Name>
                        </div>
                      </Identity>
                    </div>
                    <div className="col-span-3 text-right font-medium">
                      {entry.score.toLocaleString()}
                    </div>
                    <div className="col-span-2 text-right text-gray-600">
                      {entry.level + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* NFT Rewards Section */}
          <NFTRewards playerAddress={playerAddress} leaderboard={leaderboard} />
        </>
      )}
    </div>
  );
};

export default Leaderboard;
