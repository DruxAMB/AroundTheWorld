'use client';

import { useState, useEffect } from 'react';
import { Gift, Star, Flame } from 'lucide-react';

interface DailyBonusStatus {
  alreadyClaimed: boolean;
  bonusData?: {
    claimedAt: string;
    bonusAmount: number;
    date: string;
  };
  streak: number;
  totalBonusPoints: number;
  availableBonusAmount: number;
}

interface DailyBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onBonusClaimed?: (bonusAmount: number) => void;
}

export default function DailyBonusModal({ 
  isOpen, 
  onClose, 
  walletAddress, 
  onBonusClaimed 
}: DailyBonusModalProps) {
  const [status, setStatus] = useState<DailyBonusStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasShared, setHasShared] = useState(false);
  const [sharingState, setSharingState] = useState<'idle' | 'sharing' | 'completed'>('idle');
  
  useEffect(() => {
    const fetchBonusStatus = async () => {
      if (!walletAddress) return;

      // Only show loading if we don't have any data yet
      if (!hasInitialLoad) {
        setLoading(true);
      }
      
      try {
        const response = await fetch(`/api/daily-bonus?walletAddress=${walletAddress}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
          setHasInitialLoad(true);
        }
      } catch (error) {
        console.error('Failed to fetch bonus status:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && walletAddress && !hasInitialLoad) {
      fetchBonusStatus();
    }
  }, [isOpen, walletAddress, hasInitialLoad]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasInitialLoad(false);
      setStatus(null);
      setErrorMessage(null);
      setHasShared(false);
      setSharingState('idle');
    }
  }, [isOpen]);

  const claimBonus = async () => {
    if (!walletAddress || claiming) return;

    setClaiming(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/daily-bonus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          action: 'claim'
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus(prev => prev ? {
          ...prev,
          alreadyClaimed: true,
          streak: result.streak,
          totalBonusPoints: result.totalBonusPoints
        } : null);
        
        if (onBonusClaimed) {
          onBonusClaimed(result.bonusAmount);
        }

        // Don't auto-close anymore - let user share first
        // setTimeout(() => {
        //   onClose();
        //   setClaimSuccess(false);
        // }, 2000);
      } else {
        console.error('Failed to claim bonus:', result.message || 'Unknown error');
        setErrorMessage(result.message || 'Failed to claim bonus');
      }
    } catch (error) {
      console.error('Failed to claim bonus:', error);
      setErrorMessage('Failed to claim daily bonus. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const handleShare = () => {
    if (!hasShared) {
      // Update sharing state to show loading
      setSharingState('sharing');
      
      // Create the share URL for Farcaster
      const shareText = "I just claimed my daily bonus, don't forget to claim yours😉";
      const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=https://basearoundtheworld.vercel.app`;
      
      // Open in new window
      window.open(shareUrl, '_blank');
      
      // Simulate sharing process with a delay
      setTimeout(() => {
        setHasShared(true);
        setSharingState('completed');
      }, 3000); // 3-second delay
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-50 p-1">
      <div className="bg-[var(--app-card-bg)] rounded-2xl border border-[var(--app-card-border)] shadow-2xl max-w-md w-full mx-2 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[var(--app-card-border)] relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-lg text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-colors hover:animate-spin"
          >
            ✖️
          </button>
          
          <div className="flex items-center justify-center mb-2">
            <Gift size={48} className="text-[var(--app-accent)]" />
          </div>
          
          <h2 className="text-2xl font-bold text-center text-[var(--app-foreground)]">Daily Bonus</h2>
          <p className="text-center text-[var(--app-foreground-muted)] mt-1">
            Claim your free points!
          </p>
        </div>

        {/* Content */}
        <div className="p-2">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--app-accent)] mx-auto"></div>
              <p className="mt-4 text-[var(--app-foreground-muted)]">Loading bonus status...</p>
            </div>
          ) : status ? (
            <div className="space-y-2">
              {/* Bonus Amount */}
              <div className="text-center">
                <div className="bg-[var(--app-background)] rounded-xl p-6">
                  <div className="text-4xl font-bold text-[var(--app-accent)] mb-2">
                    +{status.availableBonusAmount}
                  </div>
                  <div className="text-[var(--app-foreground-muted)]">Points Available</div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--app-background)] rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Flame className="text-red-500" size={24} />
                  </div>
                  <div className="text-xl font-bold text-[var(--app-foreground)]">{status.streak}</div>
                  <div className="text-sm text-[var(--app-foreground-muted)]">Day Streak</div>
                </div>
                
                <div className="bg-[var(--app-background)] rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Star className="text-yellow-500" size={24} />
                  </div>
                  <div className="text-xl font-bold text-[var(--app-foreground)]">{status.totalBonusPoints}</div>
                  <div className="text-sm text-[var(--app-foreground-muted)]">Total Earned</div>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="text-center py-2">
                  <div className="bg-red-900/20 border border-red-700/30 text-red-400 rounded-lg p-3">
                    <div className="font-semibold">❌ Error</div>
                    <div className="text-sm mt-1 text-red-300">
                      {errorMessage}
                    </div>
                  </div>
                </div>
              )}

              {/* Claim Button or Status */}
              {status.alreadyClaimed ? (
                <>
                    <div className="text-center space-y-4">
                      <div className="bg-green-900/20 border border-green-700/30 text-green-400 rounded-lg p-4 animate-pulse">
                        <div className="font-semibold">🎉 Bonus Claimed!</div>
                        <div className="text-sm mt-1 text-green-300">
                          +{status.availableBonusAmount} points added to your score
                        </div>
                      </div>

                      {/* Share Button */}
                      <div className="flex flex-col">
                        <button
                          onClick={handleShare}
                          className="py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                          disabled={hasShared || sharingState === 'sharing'}
                        >
                          {hasShared ? 'Shared!' :
                            sharingState === 'sharing' ? 'Sharing...' : 'Share Daily Bonus'}
                        </button>
                        {sharingState === 'sharing' && (
                          <div className="flex items-center justify-center mt-2">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent mr-2"></div>
                            <p className="text-blue-500 text-sm">Processing...</p>
                          </div>
                        )}
                      </div>
                    </div></>
              ) : (
                <button
                  onClick={claimBonus}
                  disabled={claiming}
                  className="w-full bg-[var(--app-accent)] text-white font-bold py-4 px-6 rounded-xl hover:opacity-90 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {claiming ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Claiming...
                    </div>
                  ) : (
                    'Claim Daily Bonus'
                  )}
                </button>
              )}

              {/* Footer Info */}
              <div className="text-center text-sm text-[var(--app-foreground-muted)]">
                Daily bonuses reset at midnight UTC
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[var(--app-foreground-muted)]">Failed to load bonus status</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 text-[var(--app-accent)] hover:opacity-80 font-medium"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
