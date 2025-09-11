import { cdp } from './client';
import { getRewardDistributorWallet } from './cdp-wallet';
import { prepareSpendCallData } from '@base-org/account/spend-permission';
import { Address } from 'viem';

interface SpendPermissionRecord {
  userAddress: string;
  permission: any;
  dailyContribution: number;
  lastCollected: Date;
}

/**
 * AI Agent that automatically collects contributions from users via spend permissions
 * and manages the reward pool for automated distribution
 */
export class SpendPermissionAgent {
  private permissions: Map<string, SpendPermissionRecord> = new Map();

  /**
   * Register a user's spend permission for automated collection
   */
  async registerUserPermission(
    userAddress: string, 
    permission: any, 
    dailyContributionETH: number
  ) {
    console.log(`🤖 AI Agent: Registering spend permission for ${userAddress}`);
    
    this.permissions.set(userAddress, {
      userAddress,
      permission,
      dailyContribution: dailyContributionETH,
      lastCollected: new Date(0) // Start from epoch to allow immediate collection
    });

    console.log(`✅ User ${userAddress} registered for ${dailyContributionETH} ETH daily contributions`);
  }

  /**
   * AI Agent automatically collects contributions from all registered users
   */
  async collectDailyContributions(): Promise<{ 
    totalCollected: number; 
    successfulCollections: number; 
    failedCollections: string[] 
  }> {
    console.log('🤖 AI Agent: Starting automated daily contribution collection...');
    
    // Check if CDP client is available (server-side only)
    if (!cdp) {
      throw new Error('CDP client not available - this function must be called server-side');
    }
    
    const wallet = await getRewardDistributorWallet();
    let totalCollected = 0;
    let successfulCollections = 0;
    const failedCollections: string[] = [];
    const now = new Date();

    for (const [userAddress, record] of this.permissions) {
      try {
        // Check if 24 hours have passed since last collection
        const hoursSinceLastCollection = (now.getTime() - record.lastCollected.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastCollection < 24) {
          console.log(`⏰ Skipping ${userAddress} - only ${hoursSinceLastCollection.toFixed(1)} hours since last collection`);
          continue;
        }

        console.log(`💰 Collecting ${record.dailyContribution} ETH from ${userAddress}`);

        // Prepare spend call data
        const amountWei = BigInt(Math.floor(record.dailyContribution * 1e18));
        const spendCalls = await prepareSpendCallData(record.permission, amountWei);

        // Execute collection via smart account user operation
        const userOp = await cdp!.evm.sendUserOperation({
          smartAccount: wallet.smartAccount,
          network: "base-sepolia",
          calls: spendCalls.map(call => ({
            to: call.to as Address,
            value: call.value ? BigInt(call.value.toString()) : BigInt(0),
            data: call.data as `0x${string}`,
          })),
        });

        console.log(`📡 Collection user operation sent: ${userOp.userOpHash}`);

        // Wait for confirmation
        const result = await cdp!.evm.waitForUserOperation({
          userOpHash: userOp.userOpHash,
          smartAccountAddress: wallet.smartAccount.address as Address,
        });

        if (result.status === 'complete') {
          console.log(`✅ Successfully collected ${record.dailyContribution} ETH from ${userAddress}`);
          console.log(`🔗 Transaction: ${result.transactionHash}`);
          
          // Update last collected timestamp
          record.lastCollected = now;
          totalCollected += record.dailyContribution;
          successfulCollections++;
        } else {
          console.error(`❌ Collection failed for ${userAddress}: ${result.status}`);
          failedCollections.push(userAddress);
        }

      } catch (error) {
        console.error(`❌ Failed to collect from ${userAddress}:`, error);
        failedCollections.push(userAddress);
      }

      // Add delay between collections to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`🤖 AI Agent collection complete: ${totalCollected} ETH collected from ${successfulCollections} users`);
    
    return {
      totalCollected,
      successfulCollections,
      failedCollections
    };
  }

  /**
   * Get current registered permissions
   */
  getRegisteredPermissions(): SpendPermissionRecord[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Remove a user's permission (when they revoke)
   */
  removeUserPermission(userAddress: string) {
    console.log(`🤖 AI Agent: Removing permission for ${userAddress}`);
    this.permissions.delete(userAddress);
  }

  /**
   * AI Agent decides when to trigger reward distribution based on collected funds
   */
  async shouldTriggerRewardDistribution(): Promise<boolean> {
    // Check if CDP client is available (server-side only)
    if (!cdp) {
      throw new Error('CDP client not available - this function must be called server-side');
    }
    
    const wallet = await getRewardDistributorWallet();
    
    // Get current balance
    const result = await cdp!.evm.listTokenBalances({
      address: wallet.smartAccount.address as Address,
      network: "base-sepolia"
    });
    
    const ethBalance = result.balances.find(balance => 
      balance.token.contractAddress.toLowerCase() === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ||
      balance.token.symbol?.toLowerCase() === 'eth'
    );
    
    const currentBalance = ethBalance 
      ? Number(ethBalance.amount.amount) / Math.pow(10, ethBalance.amount.decimals)
      : 0;

    // AI logic: Trigger distribution if we have enough for meaningful rewards
    const minimumPoolForDistribution = 0.01; // 0.01 ETH minimum
    const shouldTrigger = currentBalance >= minimumPoolForDistribution;

    console.log(`🤖 AI Agent: Current pool balance: ${currentBalance} ETH`);
    console.log(`🤖 AI Agent: Should trigger distribution: ${shouldTrigger}`);

    return shouldTrigger;
  }
}

// Global AI agent instance
export const spendPermissionAgent = new SpendPermissionAgent();
