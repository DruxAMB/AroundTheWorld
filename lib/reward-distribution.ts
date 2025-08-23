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
    const distributions = this.REWARD_TIERS.map(tier => ({
      rank: tier.rank,
      amount: Math.floor((totalPoolAmount * tier.percentage) / 100),
      percentage: tier.percentage,
      tier: tier.tier
    }));

    return {
      totalPool: totalPoolAmount,
      distributions
    };
  }

  static getRewardForRank(rank: number, totalPoolAmount: number): number {
    const tier = this.REWARD_TIERS.find(t => t.rank === rank);
    if (!tier) return 0;
    
    return Math.floor((totalPoolAmount * tier.percentage) / 100);
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
    // Format as ETH with appropriate decimals and commas
    const eth = amount / 1e18;
    if (eth >= 1) {
      return `${eth.toFixed(3)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else if (eth >= 0.001) {
      return `${eth.toFixed(4)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else {
      return `${eth.toFixed(6)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
