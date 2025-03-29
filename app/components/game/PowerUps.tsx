"use client";

import React from 'react';
import { PowerUp, PowerUpType } from '../../utils/gameTypes';
import { playSound } from '../../utils/sound';

interface PowerUpsProps {
  availablePowerUps: PowerUp[];
  onUsePowerUp: (powerUp: PowerUp) => void;
}

const PowerUps: React.FC<PowerUpsProps> = ({ availablePowerUps, onUsePowerUp }) => {
  const handleUsePowerUp = (powerUp: PowerUp) => {
    playSound('click');
    onUsePowerUp(powerUp);
  };

  if (availablePowerUps.length === 0) {
    return (
      <div className="power-ups-container p-2 bg-gray-100 rounded-lg mb-4">
        <h3 className="text-lg font-bold mb-2">Power-Ups</h3>
        <p className="text-sm text-gray-500">Match 4 or more items to earn power-ups!</p>
      </div>
    );
  }

  return (
    <div className="power-ups-container p-2 bg-gray-100 rounded-lg mb-4">
      <h3 className="text-lg font-bold mb-2">Power-Ups</h3>
      <div className="flex flex-wrap gap-2">
        {availablePowerUps.map((powerUp, index) => (
          <button
            key={`${powerUp.type}-${index}`}
            className="power-up-button flex items-center justify-center p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            onClick={() => handleUsePowerUp(powerUp)}
            title={powerUp.description}
          >
            <span className="text-xl mr-1">{powerUp.icon}</span>
            <span className="text-sm">{getPowerUpLabel(powerUp.type)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Helper function to get a shorter label for the power-up
const getPowerUpLabel = (type: PowerUpType): string => {
  switch (type) {
    case PowerUpType.ROW_CLEAR:
      return 'Row';
    case PowerUpType.COLUMN_CLEAR:
      return 'Column';
    case PowerUpType.AREA_CLEAR:
      return 'Area';
    case PowerUpType.EXTRA_TIME:
      return '+15s';
    case PowerUpType.SCORE_MULTIPLIER:
      return '2x Score';
    default:
      return '';
  }
};

export default PowerUps;
