"use client";

import React from 'react';
import { Region } from '../../utils/gameTypes';
import { levels } from '../../utils/gameData';
import { playSound } from '../../utils/sound';

interface LevelSelectionProps {
  onSelectLevel: (levelIndex: number) => void;
  currentLevel: number;
  unlockedLevels: number;
}

const LevelSelection: React.FC<LevelSelectionProps> = ({
  onSelectLevel,
  currentLevel,
  unlockedLevels
}) => {
  const handleLevelSelect = (levelIndex: number) => {
    if (levelIndex <= unlockedLevels) {
      playSound('click');
      onSelectLevel(levelIndex);
    } else {
      playSound('transactionFailure');
    }
  };

  // Get the background image for a region
  const getRegionBackgroundImage = (region: Region): string => {
    switch (region) {
      case Region.LATAM:
        return '/latam.jpg';
      case Region.AFRICA:
        return '/africa.jpg';
      case Region.SOUTHEAST_ASIA:
        return '/southeastasia.jpg';
      case Region.INDIA:
        return '/india.jpg';
      default:
        return '/around-the-world.jpg';
    }
  };

  return (
    <div className="level-selection p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Select a Region</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {levels.map((level, index) => {
          const isUnlocked = index <= unlockedLevels;
          const isActive = index === currentLevel;
          const backgroundImage = getRegionBackgroundImage(level.region);
          
          return (
            <div
              key={index}
              className={`level-card p-4 rounded-lg border-2 transition-all duration-200 relative cursor-pointer ${
                isUnlocked 
                  ? isActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 bg-white hover:border-blue-300 cursor-pointer'
                  : 'border-gray-200 bg-gray-100 opacity-70 cursor-not-allowed'
              }`}
              onClick={() => handleLevelSelect(index)}
            >
              <div className="level-header flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold">{getRegionName(level.region)}</h3>
                <span className="level-number bg-gray-200 px-2 py-1 rounded-full text-sm">
                  Level {index + 1}
                </span>
              </div>
              
              <div className="level-image-container h-32 mb-3 overflow-hidden rounded-md">
                <div 
                  className="level-image h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${backgroundImage})` }}
                ></div>
              </div>
              
              <div className="level-info text-sm">
                <div className="flex justify-between mb-1">
                  <span>Target Score:</span>
                  <span className="font-medium">{level.targetScore}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time Limit:</span>
                  <span className="font-medium">{Math.floor(level.timeLimit / 60)}:{(level.timeLimit % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
              
              {!isUnlocked && (
                <div className="locked-overlay absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 rounded-lg z-10">
                  <div className="flex items-center bg-white px-3 py-2 rounded-full">
                    <span className="text-lg mr-2">🔒</span>
                    <span className="font-medium">Complete previous level</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper function to get a formatted region name
const getRegionName = (region: Region): string => {
  switch (region) {
    case Region.LATAM:
      return 'Latin America';
    case Region.AFRICA:
      return 'Africa';
    case Region.SOUTHEAST_ASIA:
      return 'Southeast Asia';
    case Region.INDIA:
      return 'India';
    default:
      return '';
  }
};

export default LevelSelection;
