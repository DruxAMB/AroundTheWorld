export interface RewardTier {
  rank: number;
  percentage: number;
  tier: 'champion' | 'elite' | 'competitive' | 'participant';
}

export interface RewardDistribution {
  totalPool: number; // In wei or smallest unit
  distributions: {
    rank: number;
    amount: number;
    percentage: number;
    tier: string;
  }[];
}

export class RewardDistributionService {
  // Top 10 reward distribution percentages
  private static readonly REWARD_TIERS: RewardTier[] = [
    { rank: 1, percentage: 40, tier: 'champion' },      // 1st place: 40%
    { rank: 2, percentage: 12.5, tier: 'elite' },       // 2nd place: 12.5%
    { rank: 3, percentage: 12.5, tier: 'elite' },       // 3rd place: 12.5%
    { rank: 4, percentage: 6.7, tier: 'competitive' },  // 4th place: 6.7%
    { rank: 5, percentage: 6.7, tier: 'competitive' },  // 5th place: 6.7%
    { rank: 6, percentage: 6.6, tier: 'competitive' },  // 6th place: 6.6%
    { rank: 7, percentage: 3.75, tier: 'participant' }, // 7th place: 3.75%
    { rank: 8, percentage: 3.75, tier: 'participant' }, // 8th place: 3.75%
    { rank: 9, percentage: 3.75, tier: 'participant' }, // 9th place: 3.75%
    { rank: 10, percentage: 3.75, tier: 'participant' } // 10th place: 3.75%
  ];

  static calculateRewardDistribution(totalPoolAmount: number): RewardDistribution {
    const distributions = this.REWARD_TIERS.map(tier => {
      // Use the same BigInt calculation as getRewardForRank for consistency
      const amount = Number(
        (BigInt(Math.round(totalPoolAmount)) * BigInt(tier.percentage * 100)) / BigInt(10000)
      );
      
      return {
        rank: tier.rank,
        amount,
        percentage: tier.percentage,
        tier: tier.tier
      };
    });

    return {
      totalPool: totalPoolAmount,
      distributions
    };
  }

  static getRewardForRank(rank: number, totalPoolAmount: number): number {
    const tier = this.REWARD_TIERS.find(t => t.rank === rank);
    if (!tier) return 0;
    
    // More precise calculation for large numbers
    // Use exact percentage division to avoid floating point errors
    return Number((BigInt(Math.round(totalPoolAmount)) * BigInt(tier.percentage * 100)) / BigInt(10000));
  }

  static isRewardEligible(rank: number): boolean {
    return rank >= 1 && rank <= 10;
  }

  static getRewardTier(rank: number): string {
    const tier = this.REWARD_TIERS.find(t => t.rank === rank);
    return tier?.tier || 'none';
  }

  static getRewardTierEmoji(tier: string): string {
    switch (tier) {
      case 'champion': return '🥇';
      case 'elite': return '🥈';
      case 'competitive': return '🥉';
      case 'participant': return '🏆';
      default: return '';
    }
  }

  static formatRewardAmount(amount: number): string {
    try {
      // Ensure we're working with a valid number
      if (isNaN(amount) || !isFinite(amount)) {
        return "0";
      }
      
      // Convert scientific notation to a proper string for very large numbers
      const numberStr = amount.toString();
      
      // Handle scientific notation directly
      if (numberStr.includes('e+')) {
        const parts = numberStr.split('e+');
        const base = parts[0];
        const exponent = parseInt(parts[1], 10);
        
        // Convert from wei to token units (divide by 1e18)
        const adjustedExponent = Math.max(0, exponent - 18);
        
        if (adjustedExponent > 0) {
          // Format as whole number with commas for very large numbers
          let baseDigits = base.replace('.', '');
          // Pad with zeros as needed
          baseDigits = baseDigits.padEnd(adjustedExponent + 1, '0');
          // Insert commas for readability
          return baseDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        } else {
          // Regular number that fits in JavaScript's precision
          const tokenAmount = amount / 1e18;
          return this.formatNormalNumber(tokenAmount);
        }
      } else {
        // For normal numbers (not in scientific notation)
        const tokenAmount = amount / 1e18;
        return this.formatNormalNumber(tokenAmount);
      }
    } catch (error) {
      console.error("Error formatting reward amount:", error);
      return "0";
    }
  }
  
  // Helper method to format normal-sized numbers
  private static formatNormalNumber(tokenAmount: number): string {
    if (tokenAmount >= 1000) {
      // For large amounts, show fewer decimal places
      return `${Math.round(tokenAmount).toLocaleString()}`;
    } else if (tokenAmount >= 1) {
      return `${tokenAmount.toFixed(3)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else if (tokenAmount >= 0.001) {
      return `${tokenAmount.toFixed(4)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else {
      return `${tokenAmount.toFixed(6)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  }

  // Get motivational messages based on rank and reward eligibility
  static getRewardMotivationMessage(currentRank: number, totalPoolAmount: number): string {
    if (currentRank <= 10) {
      const reward = this.getRewardForRank(currentRank, totalPoolAmount);
      const tier = this.getRewardTier(currentRank);
      const emoji = this.getRewardTierEmoji(tier);
      
      return `${emoji} Rank ${currentRank} - You're earning ${this.formatRewardAmount(reward)}!`;
    } else if (currentRank <= 15) {
      const spotsAway = currentRank - 10;
      const rank10Reward = this.getRewardForRank(10, totalPoolAmount);
      
      return `🎯 Only ${spotsAway} spots from rewards! Rank 10 earns ${this.formatRewardAmount(rank10Reward)}`;
    } else if (currentRank <= 25) {
      const rank10Reward = this.getRewardForRank(10, totalPoolAmount);
      
      return `⚡ Push for Top 10 rewards! Minimum reward: ${this.formatRewardAmount(rank10Reward)}`;
    } else {
      const rank1Reward = this.getRewardForRank(1, totalPoolAmount);
      
      return `🏆 Climb the leaderboard! Winner takes ${this.formatRewardAmount(rank1Reward)}`;
    }
  }
}
