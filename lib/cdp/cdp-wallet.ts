import { CdpClient } from '@coinbase/cdp-sdk';
import { Address, parseEther } from 'viem';
import { cdp } from './client';
import fs from 'fs';
import path from 'path';

let cdpClient: CdpClient | null = null;

export function getCdpClient(): CdpClient {
  if (!cdpClient) {
    cdpClient = new CdpClient();
  }
  return cdpClient;
}

interface ServerWallet {
  address: string;
  walletClient: any;
  account: any;
  smartAccount?: any;
}

interface WalletStorage {
  rewardDistributor?: {
    address: string;
    smartAccountAddress: string;
    createdAt: string;
  };
}

const WALLET_STORAGE_PATH = path.join(process.cwd(), '.wallet-storage.json');

function loadWalletStorage(): WalletStorage {
  try {
    if (fs.existsSync(WALLET_STORAGE_PATH)) {
      const data = fs.readFileSync(WALLET_STORAGE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load wallet storage:', error);
  }
  return {};
}

function saveWalletStorage(storage: WalletStorage): void {
  try {
    fs.writeFileSync(WALLET_STORAGE_PATH, JSON.stringify(storage, null, 2));
  } catch (error) {
    console.error('Failed to save wallet storage:', error);
  }
}

// Removed per-user wallet creation - we only need one reward distributor wallet

// Use a global variable to persist across hot reloads in development
declare global {
  var __rewardDistributorWallet: ServerWallet | undefined;
}

const rewardDistributorWallet = globalThis.__rewardDistributorWallet;
globalThis.__rewardDistributorWallet = rewardDistributorWallet;

// Remove the old getCdpClient function - now using centralized client

export async function getRewardDistributorWallet(): Promise<ServerWallet> {
  try {
    // Check if wallet already exists in memory
    if (globalThis.__rewardDistributorWallet?.smartAccount) {
      console.log('Found existing reward distributor wallet in memory');
      return globalThis.__rewardDistributorWallet;
    }

    // Load from persistent storage - ALWAYS use stored addresses, never create new ones
    const storage = loadWalletStorage();
    if (storage.rewardDistributor) {
      console.log(`🏦 Using persistent reward distributor: ${storage.rewardDistributor.address}`);
      console.log(`📍 Smart Account: ${storage.rewardDistributor.smartAccountAddress}`);
      
      // Return wallet object with persistent addresses - no creation needed
      const persistentWallet: ServerWallet = {
        address: storage.rewardDistributor.address,
        walletClient: null, // Not needed for address reference
        account: null, // Not needed for address reference
        smartAccount: {
          address: storage.rewardDistributor.smartAccountAddress
        }
      };

      globalThis.__rewardDistributorWallet = persistentWallet;
      return persistentWallet;
    }

    // If no wallet exists in storage, throw error - manual setup required
    throw new Error('No reward distributor wallet found in storage. Please set up wallet addresses manually in .wallet-storage.json');
  } catch (error) {
    console.error('❌ Failed to get reward distributor wallet:', error);
    throw error;
  }
}

// Get wallet balance
export const getWalletBalance = async (): Promise<{ eth: string; usd?: string }> => {
  try {
    // Check if CDP client is available
    if (!cdp) {
      throw new Error('CDP client not available - this function must be called server-side');
    }

    const wallet = await getRewardDistributorWallet();
    
    // Get ETH balance of the smart account (where funds are held for user operations)
    const result = await cdp.evm.listTokenBalances({
      address: wallet.smartAccount.address as Address,
      network: "base-sepolia"
    });
    
    // Find ETH balance in the response (ETH contract address is 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)
    const ethBalance = result.balances.find(balance => 
      balance.token.contractAddress.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ||
      balance.token.symbol?.toLowerCase() === 'eth'
    );
    
    // Convert from wei to ETH (divide by 10^18)
    const ethAmount = ethBalance 
      ? (Number(ethBalance.amount.amount) / Math.pow(10, ethBalance.amount.decimals)).toString()
      : '0';
    
    return {
      eth: ethAmount,
      usd: undefined // USD conversion can be added later
    };
  } catch (error) {
    console.error('❌ Failed to get wallet balance:', error);
    return { eth: '0' };
  }
};

// Execute reward distribution transaction using smart account with gas sponsorship
export const distributeReward = async (
  recipientAddress: string, 
  amount: string, // Amount in ETH
  memo?: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
  try {
    const wallet = await getRewardDistributorWallet();
    
    console.log(`💸 Distributing ${amount} ETH to ${recipientAddress}`);
    console.log(`🏦 Using smart account address: ${wallet.smartAccount.address}`);
    
    // Check if CDP client is available
    if (!cdp) {
      throw new Error('CDP client not available - this function must be called server-side');
    }

    // Use sendUserOperation with smart account for gas sponsorship
    const userOp = await cdp.evm.sendUserOperation({
      smartAccount: wallet.smartAccount,
      network: "base-sepolia",
      calls: [
        {
          to: recipientAddress as Address,
          value: parseEther(amount),
          data: "0x", // No additional data for simple ETH transfer
        },
      ],
    });

    console.log(`✅ User operation sent successfully: ${userOp.userOpHash}`);
    
    // Wait for the user operation to be confirmed
    const result = await cdp.evm.waitForUserOperation({
      userOpHash: userOp.userOpHash,
      smartAccountAddress: wallet.smartAccount.address as Address,
    });

    if (result.status === 'complete') {
      console.log(`✅ Reward distributed successfully. Transaction hash: ${result.transactionHash}`);
      return {
        success: true,
        transactionHash: result.transactionHash
      };
    } else {
      console.error(`❌ User operation failed with status: ${result.status}`);
      return {
        success: false,
        error: `User operation failed with status: ${result.status}`
      };
    }
  } catch (error) {
    console.error('❌ Failed to distribute reward:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Batch reward distribution for multiple recipients
export const batchDistributeRewards = async (
  distributions: Array<{ address: string; amount: string; memo?: string }>
): Promise<Array<{ address: string; success: boolean; transactionHash?: string; error?: string }>> => {
  const results = [];
  
  for (const distribution of distributions) {
    const result = await distributeReward(
      distribution.address, 
      distribution.amount, 
      distribution.memo
    );
    
    results.push({
      address: distribution.address,
      ...result
    });
    
    // Add small delay between transactions to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
};

// Validate wallet configuration
export const validateWalletConfig = async (): Promise<{ isValid: boolean; error?: string }> => {
  try {
    const wallet = await getRewardDistributorWallet();
    const balance = await getWalletBalance();
    
    console.log('✅ Wallet configuration valid');
    console.log(`💰 Current balance: ${balance.eth} ETH`);
    console.log(`🏦 Wallet address: ${wallet.address}`);
    
    return { isValid: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
    console.error('❌ Wallet configuration invalid:', errorMessage);
    return { isValid: false, error: errorMessage };
  }
};
