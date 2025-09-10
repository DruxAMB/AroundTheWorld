export interface RewardTier {
  rank: number;
  percentage: number;
  tier: 'champion' | 'elite' | 'competitive' | 'participant' | 'contender';
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
  // Top 15 reward distribution percentages
  private static readonly REWARD_TIERS: RewardTier[] = [
    { rank: 1, percentage: 20, tier: 'champion' },      // 1st place: 20%
    { rank: 2, percentage: 15, tier: 'elite' },         // 2nd place: 15%
    { rank: 3, percentage: 10, tier: 'elite' },         // 3rd place: 10%
    { rank: 4, percentage: 8, tier: 'competitive' },    // 4th place: 8%
    { rank: 5, percentage: 8, tier: 'competitive' },    // 5th place: 8%
    { rank: 6, percentage: 8, tier: 'competitive' },    // 6th place: 8%
    { rank: 7, percentage: 6, tier: 'participant' },    // 7th place: 6%
    { rank: 8, percentage: 6, tier: 'participant' },    // 8th place: 6%
    { rank: 9, percentage: 4, tier: 'participant' },    // 9th place: 4%
    { rank: 10, percentage: 4, tier: 'participant' },   // 10th place: 4%
    { rank: 11, percentage: 2.2, tier: 'contender' },   // 11th place: 2.2%
    { rank: 12, percentage: 2.2, tier: 'contender' },   // 12th place: 2.2%
    { rank: 13, percentage: 2.2, tier: 'contender' },   // 13th place: 2.2%
    { rank: 14, percentage: 2.2, tier: 'contender' },   // 14th place: 2.2%
    { rank: 15, percentage: 2.2, tier: 'contender' }    // 15th place: 2.2%
  ];

  static calculateRewardDistribution(totalPoolAmount: number): RewardDistribution {
    const distributions = this.REWARD_TIERS.map(tier => {
      // Use the same BigInt calculation as getRewardForRank for consistency
      // Round the percentage calculation to avoid floating point errors
      const percentagePoints = Math.round(tier.percentage * 100);
      const amount = Number(
        (BigInt(Math.round(totalPoolAmount)) * BigInt(percentagePoints)) / BigInt(10000)
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
    const percentagePoints = Math.round(tier.percentage * 100);
    return Number((BigInt(Math.round(totalPoolAmount)) * BigInt(percentagePoints)) / BigInt(10000));
  }

  static isRewardEligible(rank: number): boolean {
    return rank >= 1 && rank <= 15;
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
      case 'contender': return '🎯';
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
      return `${tokenAmount.toFixed(3)}`;
    } else if (tokenAmount >= 0.001) {
      return `${tokenAmount.toFixed(4)}`;
    } else {
      return `${tokenAmount.toFixed(6)}`;
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
