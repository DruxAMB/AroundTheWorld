'use client';

import { useState, useEffect, useCallback } from 'react';

interface DailyBonusHookReturn {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  checkEligibility: (walletAddress: string) => Promise<boolean>;
  hasCheckedToday: boolean;
}

export function useDailyBonus(): DailyBonusHookReturn {
  const [showModal, setShowModal] = useState(false);
  const [hasCheckedToday, setHasCheckedToday] = useState(false);

  const checkEligibility = useCallback(async (walletAddress: string): Promise<boolean> => {
    if (!walletAddress || hasCheckedToday) return false;

    try {
      const response = await fetch(`/api/daily-bonus?walletAddress=${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        const isEligible = !data.alreadyClaimed;
        
        // Mark that we've checked today to avoid repeated API calls
        setHasCheckedToday(true);
        
        // Show modal if eligible
        if (isEligible) {
          setShowModal(true);
        }
        
        return isEligible;
      }
    } catch (error) {
      console.error('Failed to check daily bonus eligibility:', error);
    }
    
    return false;
  }, [hasCheckedToday]);

  // Reset check status at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timeout = setTimeout(() => {
      setHasCheckedToday(false);
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  return {
    showModal,
    setShowModal,
    checkEligibility,
    hasCheckedToday
  };
}
