import { CdpClient } from '@coinbase/cdp-sdk'
import { createWalletClient, http } from 'viem'
import { toAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

// USDC token address on Base mainnet
export const ETH_BASE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

let cdpClient: CdpClient | null = null

export function getCdpClient(): CdpClient {
  if (!cdpClient) {
    cdpClient = new CdpClient()
  }
  return cdpClient
}

interface ServerWallet {
  address: string
  walletClient: Record<string, unknown>
  account: Record<string, unknown>
  smartAccount?: Record<string, unknown>
}

// Use a global variable to persist across hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var __serverWallets: Map<string, ServerWallet> | undefined
}

const serverWallets = globalThis.__serverWallets ?? new Map<string, ServerWallet>()
globalThis.__serverWallets = serverWallets

export async function createServerWalletForUser(userAddress: string): Promise<ServerWallet> {
  try {
    console.log('Creating/getting server wallet for user:', userAddress)
    console.log('Current server wallets count:', serverWallets.size)
    console.log('Server wallets keys:', Array.from(serverWallets.keys()))
    
    // Check if wallet already exists for this user
    if (serverWallets.has(userAddress) && serverWallets.get(userAddress)?.smartAccount) {
      console.log('Found existing server wallet for user:', userAddress)
      return serverWallets.get(userAddress)!
    }

    console.log('Creating new server wallet for user:', userAddress)
    const cdp = getCdpClient()
    
    // Create CDP account
    const account = await cdp.evm.createAccount()
    console.log('Created CDP account with address:', account.address)

    // Create viem wallet client
    const walletClient = createWalletClient({
      account: toAccount(account),
      chain: baseSepolia,
      transport: http(),
    })

    // Create smart account for gas sponsorship
    const smartAccount = await cdp.evm.createSmartAccount({
      owner: account,
    })

    console.log('Smart account:', smartAccount)

    const serverWallet: ServerWallet = {
      address: account.address,
      walletClient,
      account,
      smartAccount
    }

    // Store wallet for this user session
    serverWallets.set(userAddress, serverWallet)
    console.log('Stored server wallet with smart account. New count:', serverWallets.size)

    // Note: Server wallet will use gas sponsorship via paymaster, no funding needed
    console.log('Server wallet created for Base mainnet with gas sponsorship')

    return serverWallet
  } catch (error) {
    console.error('Failed to create server wallet:', error)
    throw new Error('Failed to create server wallet')
  }
}

export function getServerWalletForUser(userAddress: string): ServerWallet | null {
  return serverWallets.get(userAddress) || null
}

export async function getRewardDistributorWallet(adminAddress: string): Promise<ServerWallet> {
  // Create server wallet for authenticated admin (Base demo pattern)
  if (!adminAddress || adminAddress === '0x0000000000000000000000000000000000000001') {
    throw new Error('Valid admin address required for reward distribution')
  }
  
  let wallet = getServerWalletForUser(adminAddress)
  if (!wallet) {
    wallet = await createServerWalletForUser(adminAddress)
  }
  
  return wallet
}

export async function getWalletBalance(walletAddress: string): Promise<string> {
  try {
    // Use viem to get balance directly from Base Sepolia testnet
    const { createPublicClient, http } = await import('viem')
    const { baseSepolia } = await import('viem/chains')
    
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http()
    })
    
    const balance = await publicClient.getBalance({
      address: walletAddress as `0x${string}`
    })
    
    return balance.toString()
  } catch (error) {
    console.error('Failed to get wallet balance:', error)
    return '0'
  }
}

export async function distributeReward(
  toAddress: string, 
  amount: string,
  adminAddress: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    console.log('Starting single reward distribution:', { toAddress, amount })
    
    // Get the reward distributor wallet
    const distributorWallet = await getRewardDistributorWallet(adminAddress)
    
    if (!distributorWallet.smartAccount) {
      throw new Error('Smart account not available for reward distribution')
    }
    
    // Convert amount to ETH (18 decimals)
    const ethAmount = BigInt(Math.floor(parseFloat(amount) * 1e18))
    
    // Execute native ETH transfer directly to player address
    const result = await distributorWallet.smartAccount.sendUserOperation({
      calls: [{
        to: toAddress as `0x${string}`,
        value: ethAmount,
        data: '0x' // No data needed for native ETH transfer
      }],
      paymaster: process.env.PAYMASTER_URL ? {
        url: process.env.PAYMASTER_URL
      } : undefined
    })
    
    console.log('Single distribution result:', result)
    
    return {
      success: true,
      transactionHash: result.userOpHash
    }
  } catch (error) {
    console.error('Single reward distribution failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function executeSpendPermissionAndDistribute(
  spendPermissionCalls: Array<{ to: string; data: string }>,
  distributions: Array<{ address: string; amount: string }>,
  adminAddress: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    console.log('Starting spend permission + reward distribution:', {
      spendCalls: spendPermissionCalls.length,
      distributions: distributions.length,
      adminAddress
    })
    
    // Get the reward distributor wallet
    const distributorWallet = await getRewardDistributorWallet(adminAddress)
    
    if (!distributorWallet.smartAccount) {
      throw new Error('Smart account not available for reward distribution')
    }

    const cdpClient = getCdpClient()
    
    // Step 1: Execute spend permission calls to pull USDC from admin wallet
    console.log(' Executing spend permission calls to pull funds from admin wallet')
    const spendResult = await cdpClient.evm.sendUserOperation({
      smartAccount: distributorWallet.smartAccount,
      network: "base-sepolia",
      calls: spendPermissionCalls.map(call => ({
        to: call.to as `0x${string}`,
        data: call.data as `0x${string}`
      })),
      paymasterUrl: process.env.PAYMASTER_URL,
    })
    
    console.log('Spend permission execution result:', spendResult)
    
    // Wait for spend permission to be confirmed
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Step 2: Distribute USDC from server wallet to reward recipients
    const ETH_BASE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
    const transferSelector = '0xa9059cbb' // transfer(address,uint256)
    
    const distributionCalls = distributions.map(dist => {
      const recipientAddress = dist.address.slice(2).padStart(64, '0')
      const transferAmount = BigInt(dist.amount).toString(16).padStart(64, '0')
      const transferData = `${transferSelector}${recipientAddress}${transferAmount}`
      
      return {
        to: ETH_BASE_ADDRESS as `0x${string}`,
        data: transferData as `0x${string}`
      }
    })
    
    console.log(' Executing batch USDC transfers to reward recipients')
    const distributionResult = await cdpClient.evm.sendUserOperation({
      smartAccount: distributorWallet.smartAccount,
      network: "base-sepolia",
      calls: distributionCalls,
      paymasterUrl: process.env.PAYMASTER_URL,
    })
    
    console.log('Batch distribution result:', distributionResult)
    
    return {
      success: true,
      transactionHash: distributionResult.userOpHash
    }
  } catch (error) {
    console.error('Spend permission + distribution failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function batchDistributeRewards(
  distributions: Array<{ address: string; amount: string }>,
  adminAddress: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    console.log('Starting batch reward distribution:', distributions)
    
    // Get the reward distributor wallet
    const distributorWallet = await getRewardDistributorWallet(adminAddress)
    
    if (!distributorWallet.smartAccount) {
      throw new Error('Smart account not available for reward distribution')
    }
    
    const cdpClient = getCdpClient()
    const ETH_BASE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
    const transferSelector = '0xa9059cbb' // transfer(address,uint256)
    
    // Prepare USDC transfer operations
    const transfers = distributions.map(dist => {
      const recipientAddress = dist.address.slice(2).padStart(64, '0')
      const transferAmount = BigInt(dist.amount).toString(16).padStart(64, '0')
      const transferData = `${transferSelector}${recipientAddress}${transferAmount}`
      
      return {
        to: ETH_BASE_ADDRESS as `0x${string}`,
        data: transferData as `0x${string}`
      }
    })
    
    console.log('Prepared USDC transfers:', transfers)
    
    // Execute batch USDC transfers
    const result = await cdpClient.evm.sendUserOperation({
      smartAccount: distributorWallet.smartAccount,
      network: "base-sepolia",
      calls: transfers,
      paymasterUrl: process.env.PAYMASTER_URL,
    })
    
    console.log('Batch distribution result:', result)
    
    return {
      success: true,
      transactionHash: result.userOpHash
    }
  } catch (error) {
    console.error('Batch distribution failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
