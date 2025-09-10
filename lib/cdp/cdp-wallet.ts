import { CdpClient } from '@coinbase/cdp-sdk';
import { createWalletClient, http, Address, parseEther, parseUnits } from 'viem';
import { toAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { cdp } from './client';

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

// Use a global variable to persist across hot reloads in development
declare global {
  var __serverWallets: Map<string, ServerWallet> | undefined;
}

const serverWallets = globalThis.__serverWallets ?? new Map<string, ServerWallet>();
globalThis.__serverWallets = serverWallets;

export async function createServerWalletForUser(userAddress: string): Promise<ServerWallet> {
  try {
    console.log('Creating/getting server wallet for user:', userAddress);
    console.log('Current server wallets count:', serverWallets.size);
    console.log('Server wallets keys:', Array.from(serverWallets.keys()));
    
    // Check if wallet already exists for this user
    if (serverWallets.has(userAddress) && serverWallets.get(userAddress)?.smartAccount) {
      console.log('Found existing server wallet for user:', userAddress);
      return serverWallets.get(userAddress)!;
    }

    console.log('Creating new server wallet for user:', userAddress);
    const cdp = getCdpClient();
    
    // Create CDP account
    const account = await cdp.evm.createAccount();
    console.log('Created CDP account with address:', account.address);

    // Create viem wallet client
    const walletClient = createWalletClient({
      account: toAccount(account),
      chain: base,
      transport: http(),
    });

    // Create smart account for gas sponsorship with spend permissions enabled
    const smartAccount = await cdp.evm.createSmartAccount({
      owner: account,
      enableSpendPermissions: true, // NOTE: Smart Accounts must have spend permissions enabled at the time of creation
    });

    console.log('Smart account:', smartAccount);

    const serverWallet: ServerWallet = {
      address: account.address,
      walletClient,
      account,
      smartAccount
    };

    // Store wallet for this user session
    serverWallets.set(userAddress, serverWallet);
    console.log('Stored server wallet with smart account. New count:', serverWallets.size);

    // Note: Server wallet will use gas sponsorship via paymaster, no funding needed
    console.log('Server wallet created for Base mainnet with gas sponsorship');

    return serverWallet;
  } catch (error) {
    console.error('Failed to create server wallet:', error);
    throw new Error('Failed to create server wallet');
  }
}

export function getServerWalletForUser(userAddress: string): ServerWallet | null {
  return serverWallets.get(userAddress) || null;
}

// Use a global variable to persist across hot reloads in development
declare global {
  var __rewardDistributorWallet: ServerWallet | undefined;
}

const rewardDistributorWallet = globalThis.__rewardDistributorWallet;
globalThis.__rewardDistributorWallet = rewardDistributorWallet;

// Remove the old getCdpClient function - now using centralized client

export async function getRewardDistributorWallet(): Promise<ServerWallet> {
  try {
    // Check if CDP client is available (server-side only)
    if (!cdp) {
      throw new Error('CDP client not available - this function must be called server-side');
    }

    // Check if wallet already exists
    if (globalThis.__rewardDistributorWallet?.smartAccount) {
      console.log('Found existing reward distributor wallet');
      return globalThis.__rewardDistributorWallet;
    }

    console.log('Creating new reward distributor wallet');
    // Using centralized CDP client
    
    // Create CDP account
    const account = await cdp.evm.createAccount();
    console.log('Created CDP account with address:', account.address);

    // Create viem wallet client
    const walletClient = createWalletClient({
      account: toAccount(account),
      chain: baseSepolia,
      transport: http(),
    });

    // Create smart account for gas sponsorship with spend permissions enabled
    const smartAccount = await cdp.evm.createSmartAccount({
      owner: account,
      enableSpendPermissions: true, // NOTE: Smart Accounts must have spend permissions enabled at the time of creation
    });

    console.log('Smart account created:', smartAccount.address);

    const serverWallet: ServerWallet = {
      address: account.address,
      walletClient,
      account,
      smartAccount
    };

    // Store wallet globally
    globalThis.__rewardDistributorWallet = serverWallet;
    console.log('Reward distributor wallet created for Base Sepolia with gas sponsorship');
    console.log(`🏦 Reward distributor address: ${account.address}`);

    return serverWallet;
  } catch (error) {
    console.error('❌ Failed to create reward distributor wallet:', error);
    throw new Error('Failed to create reward distributor wallet');
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
      balance.token.contractAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
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
