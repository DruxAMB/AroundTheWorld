import { LeaderboardEntry } from '../utils/gameTypes';
import { 
  distributeWeeklyRewards, 
  saveMintedNFTToDatabase, 
  generateClaimableNFTLink,
  createNFTMetadata
} from '../utils/zoraRewards';
import { playSound } from '../utils/sound';

/**
 * Service for handling NFT rewards distribution
 */
class RewardsService {
  private static instance: RewardsService;
  private isProcessing: boolean = false;
  private lastDistributionDate: Date | null = null;
  
  /**
   * Get the singleton instance of the RewardsService
   */
  public static getInstance(): RewardsService {
    if (!RewardsService.instance) {
      RewardsService.instance = new RewardsService();
    }
    return RewardsService.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize service
    console.log('RewardsService initialized');
  }
  
  /**
   * Check if it's time to distribute weekly rewards
   * @returns true if it's time to distribute rewards, false otherwise
   */
  public isTimeToDistributeRewards(): boolean {
    // Get the current date
    const now = new Date();
    
    // If we've never distributed rewards, or it's been more than a week, return true
    if (!this.lastDistributionDate) {
      return true;
    }
    
    // Check if it's been at least 7 days since the last distribution
    const daysSinceLastDistribution = Math.floor(
      (now.getTime() - this.lastDistributionDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceLastDistribution >= 7;
  }
  
  /**
   * Distribute weekly NFT rewards to the top players
   * @param leaderboard The current leaderboard
   * @returns Array of claimable NFT links
   */
  public async distributeWeeklyRewards(leaderboard: LeaderboardEntry[]): Promise<string[]> {
    // If already processing, return empty array
    if (this.isProcessing) {
      console.log('Already processing weekly rewards distribution');
      return [];
    }
    
    // If it's not time to distribute rewards, return empty array
    if (!this.isTimeToDistributeRewards()) {
      console.log('Not time to distribute weekly rewards yet');
      return [];
    }
    
    try {
      this.isProcessing = true;
      
      // Sort the leaderboard by score (highest first)
      const sortedLeaderboard = [...leaderboard].sort((a, b) => b.score - a.score);
      
      // Get the top 3 players
      const topPlayers = sortedLeaderboard.slice(0, 3);
      
      // If there are no top players, return empty array
      if (topPlayers.length === 0) {
        console.log('No top players found for weekly rewards distribution');
        return [];
      }
      
      console.log(`Distributing weekly rewards to ${topPlayers.length} top players`);
      
      // Option 1: Mint NFTs directly to winners' wallets
      const mintedNFTs = await distributeWeeklyRewards(topPlayers);
      
      // Save minted NFTs to database
      for (const nft of mintedNFTs) {
        await saveMintedNFTToDatabase(nft);
      }
      
      // Option 2: Generate claimable NFT links
      const claimableLinks: string[] = [];
      
      for (let i = 0; i < topPlayers.length; i++) {
        const player = topPlayers[i];
        const rank = i + 1;
        
        // Create metadata for the player's NFT
        const metadata = createNFTMetadata(player, rank);
        
        // Generate a claimable link
        const claimableLink = await generateClaimableNFTLink(player.address, metadata);
        claimableLinks.push(claimableLink);
      }
      
      // Update last distribution date
      this.lastDistributionDate = new Date();
      
      // Play reward sound
      playSound('reward');
      
      console.log('Weekly rewards distribution completed successfully');
      
      return claimableLinks;
    } catch (error) {
      console.error('Error distributing weekly rewards:', error);
      return [];
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Check if a player is eligible for an NFT reward
   * @param playerAddress The player's wallet address
   * @param leaderboard The current leaderboard
   * @returns The player's rank if eligible, 0 otherwise
   */
  public getPlayerRewardEligibility(
    playerAddress: `0x${string}`,
    leaderboard: LeaderboardEntry[]
  ): number {
    if (!playerAddress) return 0;
    
    // Sort the leaderboard by score (highest first)
    const sortedLeaderboard = [...leaderboard].sort((a, b) => b.score - a.score);
    
    // Find the player's position in the leaderboard
    const playerIndex = sortedLeaderboard.findIndex(
      entry => entry.address.toLowerCase() === playerAddress.toLowerCase()
    );
    
    // If player is not in the leaderboard, return 0
    if (playerIndex === -1) return 0;
    
    // If player is in the top 3, return their rank
    if (playerIndex < 3) return playerIndex + 1;
    
    // Otherwise, return 0 (not eligible)
    return 0;
  }
}

export default RewardsService;
