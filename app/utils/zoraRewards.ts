// Import only what we need for the types
import { LeaderboardEntry } from './gameTypes';

// Zora NFT Creator contract address on Base (kept for reference)
const ZORA_NFT_CREATOR_ADDRESS = '0x04E2516A2c207E84a1839755675dfd8eF6302F0a';

/*
// These imports and variables are commented out since we're in simulation mode
// They will be uncommented when implementing real blockchain interactions
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// Environment variables should be set in .env.local
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

// Initialize the account from private key
const account = ADMIN_PRIVATE_KEY ? privateKeyToAccount(ADMIN_PRIVATE_KEY) : undefined;

// Initialize the public client for reading from the blockchain
const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

// Initialize the wallet client for writing to the blockchain
const walletClient = account 
  ? createWalletClient({
      account,
      chain: base,
      transport: http(RPC_URL),
    })
  : undefined;
*/

// Interface for NFT metadata
interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
}

// Interface for minted NFT data
interface MintedNFT {
  tokenId: bigint;
  contractAddress: `0x${string}`;
  recipient: `0x${string}`;
  txHash: `0x${string}`;
  metadata: NFTMetadata;
  timestamp: number;
}

/**
 * Creates NFT metadata for a leaderboard winner
 * @param player The player's leaderboard entry
 * @param rank The player's rank (1, 2, or 3)
 * @returns NFT metadata object
 */
export const createNFTMetadata = (player: LeaderboardEntry, rank: number): NFTMetadata => {
  const regionNames = {
    0: 'Latin America',
    1: 'Africa',
    2: 'Southeast Asia',
    3: 'India',
  };
  
  const rankLabels = {
    1: '🥇 Champion',
    2: '🥈 Runner-Up',
    3: '🥉 Third Place',
  };
  
  const regionName = regionNames[player.level as keyof typeof regionNames] || 'Global';
  const rankLabel = rankLabels[rank as keyof typeof rankLabels] || 'Top Player';
  
  // Format the date for the week of the competition
  const date = new Date();
  const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
  const weekEnd = new Date(date.setDate(date.getDate() - date.getDay() + 6));
  const dateRange = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
  
  return {
    name: `Around The World: ${rankLabel}`,
    description: `This NFT certifies that the holder achieved ${rankLabel} status in the Around The World game for the week of ${dateRange}. They scored ${player.score} points in the ${regionName} region.`,
    image: `/images/nft-rewards/rank-${rank}.png`, // Use local images for now
    attributes: [
      {
        trait_type: 'Rank',
        value: rank,
      },
      {
        trait_type: 'Score',
        value: player.score,
      },
      {
        trait_type: 'Region',
        value: regionName,
      },
      {
        trait_type: 'Week',
        value: dateRange,
      },
    ],
  };
};

/**
 * Simulates uploading NFT metadata to IPFS
 * @param metadata The NFT metadata to upload
 * @returns Mock IPFS URI for the metadata
 */
export const uploadMetadataToIPFS = async (metadata: NFTMetadata): Promise<string> => {
  try {
    // In a production environment, you would use a service like Pinata, NFT.Storage, or Zora's IPFS service
    // For this example, we'll simulate the upload and return a mock URI
    console.log('Simulating metadata upload to IPFS:', metadata);
    
    // Simulate IPFS upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return a mock IPFS URI - in production, this would be the actual URI from the IPFS service
    return `ipfs://bafybeihvhgxlxqirpmisb2xsph7x2v7gzenv3zytoebje2zuzlf2x6swve/${Date.now()}.json`;
  } catch (error) {
    console.error('Error uploading metadata to IPFS:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
};

/**
 * Simulates minting an NFT for a leaderboard winner
 * @param recipient The recipient's wallet address
 * @param metadata The NFT metadata
 * @returns The minted NFT data
 */
export const mintNFTReward = async (
  recipient: `0x${string}`,
  metadata: NFTMetadata
): Promise<MintedNFT | null> => {
  try {
    // Upload metadata to IPFS (simulated)
    const metadataURI = await uploadMetadataToIPFS(metadata);
    
    // In a production environment, this would actually mint the NFT on-chain
    // For this example, we'll simulate the minting process
    console.log(`Simulating NFT mint to ${recipient} with metadata URI: ${metadataURI}`);
    
    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a mock transaction hash
    const txHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}` as `0x${string}`;
    
    // Return the simulated minted NFT data
    const mintedNFT: MintedNFT = {
      tokenId: BigInt(Math.floor(Math.random() * 1000000)),
      contractAddress: ZORA_NFT_CREATOR_ADDRESS,
      recipient,
      txHash,
      metadata,
      timestamp: Date.now(),
    };
    
    console.log('Successfully simulated NFT reward mint:', mintedNFT);
    return mintedNFT;
  } catch (error) {
    console.error('Error simulating NFT reward mint:', error);
    return null;
  }
};

/**
 * Distributes NFT rewards to the top players on the leaderboard
 * @param leaderboard The current leaderboard
 * @returns Array of minted NFTs
 */
export const distributeWeeklyRewards = async (
  leaderboard: LeaderboardEntry[]
): Promise<MintedNFT[]> => {
  // Sort the leaderboard by score (highest first)
  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.score - a.score);
  
  // Get the top 3 players
  const topPlayers = sortedLeaderboard.slice(0, 3);
  
  const mintedNFTs: MintedNFT[] = [];
  
  // Mint NFTs for each top player
  for (let i = 0; i < topPlayers.length; i++) {
    const player = topPlayers[i];
    const rank = i + 1;
    
    // Create metadata for the player's NFT
    const metadata = createNFTMetadata(player, rank);
    
    // Mint the NFT (simulated)
    const mintedNFT = await mintNFTReward(player.address, metadata);
    
    if (mintedNFT) {
      mintedNFTs.push(mintedNFT);
    }
  }
  
  return mintedNFTs;
};

/**
 * Generates a claimable NFT link for a player
 * @param recipient The recipient's wallet address
 * @param metadata The NFT metadata
 * @returns A claimable link for the NFT
 */
export const generateClaimableNFTLink = async (
  recipient: `0x${string}`,
  metadata: NFTMetadata
): Promise<string> => {
  try {
    // Simulate metadata upload to IPFS
    const metadataURI = await uploadMetadataToIPFS(metadata);
    
    // In a real implementation, you would create a signed message or use a claim service
    // For this example, we'll return a mock URL
    const claimableLink = `https://aroundtheworld-game.com/claim-nft?recipient=${recipient}&metadata=${encodeURIComponent(metadataURI)}`;
    
    console.log('Generated mock claimable NFT link:', claimableLink);
    return claimableLink;
  } catch (error) {
    console.error('Error generating claimable NFT link:', error);
    throw new Error('Failed to generate claimable NFT link');
  }
};

/**
 * Saves minted NFT data to the database (simulated)
 * @param mintedNFT The minted NFT data
 */
export const saveMintedNFTToDatabase = async (mintedNFT: MintedNFT): Promise<void> => {
  try {
    // In a production environment, you would save this data to your database
    // For this example, we'll just log it
    console.log('Simulating database save for minted NFT:', mintedNFT);
    
    // Simulate database save delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Successfully simulated saving minted NFT to database');
  } catch (error) {
    console.error('Error simulating database save for minted NFT:', error);
    throw new Error('Failed to simulate saving minted NFT to database');
  }
};
