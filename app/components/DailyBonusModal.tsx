'use client';

import { useState, useEffect } from 'react';
import { X, Gift, Star, Flame } from 'lucide-react';

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
  const [claimSuccess, setClaimSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && walletAddress) {
      fetchBonusStatus();
    }
  }, [isOpen, walletAddress]);

  const fetchBonusStatus = async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/daily-bonus?walletAddress=${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch bonus status:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimBonus = async () => {
    if (!walletAddress || claiming) return;

    setClaiming(true);
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
        setClaimSuccess(true);
        setStatus(prev => prev ? {
          ...prev,
          alreadyClaimed: true,
          streak: result.streak,
          totalBonusPoints: result.totalBonusPoints
        } : null);
        
        if (onBonusClaimed) {
          onBonusClaimed(result.bonusAmount);
        }

        // Auto-close after success animation
        setTimeout(() => {
          onClose();
          setClaimSuccess(false);
        }, 2000);
      } else {
        alert(result.message || 'Failed to claim bonus');
      }
    } catch (error) {
      console.error('Failed to claim bonus:', error);
      alert('Failed to claim daily bonus');
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--app-card-bg)] rounded-2xl border border-[var(--app-card-border)] shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[var(--app-card-border)] relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-lg text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-colors"
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
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--app-accent)] mx-auto"></div>
              <p className="mt-4 text-[var(--app-foreground-muted)]">Loading bonus status...</p>
            </div>
          ) : status ? (
            <div className="space-y-6">
              {/* Bonus Amount */}
              <div className="text-center">
                <div className="bg-[var(--app-background)] border border-[var(--app-card-border)] rounded-xl p-6">
                  <div className="text-4xl font-bold text-[var(--app-accent)] mb-2">
                    +{status.availableBonusAmount}
                  </div>
                  <div className="text-[var(--app-foreground-muted)]">Points Available</div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--app-background)] border border-[var(--app-card-border)] rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Flame className="text-red-500" size={24} />
                  </div>
                  <div className="text-xl font-bold text-[var(--app-foreground)]">{status.streak}</div>
                  <div className="text-sm text-[var(--app-foreground-muted)]">Day Streak</div>
                </div>
                
                <div className="bg-[var(--app-background)] border border-[var(--app-card-border)] rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Star className="text-yellow-500" size={24} />
                  </div>
                  <div className="text-xl font-bold text-[var(--app-foreground)]">{status.totalBonusPoints}</div>
                  <div className="text-sm text-[var(--app-foreground-muted)]">Total Earned</div>
                </div>
              </div>

              {/* Claim Button or Status */}
              {status.alreadyClaimed ? (
                <div className="text-center py-4">
                  <div className="bg-green-900/20 border border-green-700/30 text-green-400 rounded-lg p-4">
                    <div className="font-semibold">✅ Already Claimed Today!</div>
                    <div className="text-sm mt-1 text-green-300">
                      Come back tomorrow for another bonus
                    </div>
                  </div>
                </div>
              ) : claimSuccess ? (
                <div className="text-center py-4">
                  <div className="bg-green-900/20 border border-green-700/30 text-green-400 rounded-lg p-4 animate-pulse">
                    <div className="font-semibold">🎉 Bonus Claimed!</div>
                    <div className="text-sm mt-1 text-green-300">
                      +{status.availableBonusAmount} points added to your score
                    </div>
                  </div>
                </div>
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
                onClick={fetchBonusStatus}
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
