import { createWalletClient, http, Address, parseEther, parseUnits } from 'viem';
import { toAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { cdp } from './client';

interface ServerWallet {
  address: string;
  walletClient: any;
  account: any;
  smartAccount?: any;
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

    // Create smart account for gas sponsorship
    const smartAccount = await cdp.evm.createSmartAccount({
      owner: account,
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
