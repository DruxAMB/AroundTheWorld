import { NextRequest, NextResponse } from 'next/server'
import { getRewardDistributorWallet, distributeReward } from '@/lib/cdp/cdp-wallet'
import { parseEther, formatEther } from 'viem'
import { prepareSpendCallData } from '@base-org/account/spend-permission'
import { createBaseAccountSDK } from '@base-org/account'

interface RewardDistribution {
  address: string
  position: number
  percentage: number
  amount: string
}

export async function POST(request: NextRequest) {
  try {
    const { distribution, totalAmount, adminAddress, spendPermission } = await request.json()

    if (!distribution || !Array.isArray(distribution) || distribution.length === 0) {
      return NextResponse.json({ error: 'Invalid distribution data' }, { status: 400 })
    }

    if (!adminAddress || !spendPermission) {
      return NextResponse.json({ error: 'Admin address and spend permission required' }, { status: 400 })
    }

    // Validate spend permission structure
    if (!spendPermission.account || !spendPermission.spender || !spendPermission.allowance) {
      return NextResponse.json({ error: 'Invalid spend permission structure' }, { status: 400 })
    }

    // Verify admin address matches permission account
    if (spendPermission.account.toLowerCase() !== adminAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Admin address does not match spend permission account' }, { status: 400 })
    }

    // Get server wallet for executing spend permissions
    const serverWallet = await getRewardDistributorWallet()
    
    if (!serverWallet) {
      return NextResponse.json({ error: 'Failed to initialize server wallet' }, { status: 500 })
    }

    console.log('Starting reward distribution using spend permissions:', {
      totalRecipients: distribution.length,
      totalAmount,
      adminAddress,
      serverWalletAddress: serverWallet.address
    })

    // Create Base Account SDK for spend permission operations
    const sdk = createBaseAccountSDK({
      appName: 'AroundTheWorld Game',
      appChainIds: [84532], // Base Sepolia
    })

    // Step 1: Use spend permission to transfer total reward pool from admin to server wallet
    const totalAmountWei = parseEther(totalAmount.toString())
    
    try {
      console.log('Using spend permission to transfer reward pool from admin to server wallet...')
      
      // Prepare spend call data to pull total reward pool from admin wallet to server wallet
      const spendCalls = await prepareSpendCallData(spendPermission, totalAmountWei)

      // Execute the spend calls using the server wallet (as the authorized spender)
      const provider = sdk.getProvider()
      
      // Submit the spend calls to transfer funds from admin to server wallet
      const poolTxHashes = await Promise.all(
        spendCalls.map(async (call) => {
          return await provider.request({
            method: "eth_sendTransaction",
            params: [{
              ...call,
              from: serverWallet.address, // Server wallet executes as authorized spender
            }]
          })
        })
      )
      
      console.log('Reward pool transferred to server wallet via spend permission:', poolTxHashes)
      
    } catch (poolError) {
      console.error('Failed to transfer reward pool from admin wallet:', poolError)
      return NextResponse.json({ 
        error: 'Failed to transfer reward pool from admin wallet using spend permission',
        details: poolError instanceof Error ? poolError.message : 'Unknown error'
      }, { status: 500 })
    }

    // Step 2: Now distribute from server wallet to individual players using CDP wallet
    const transferResults = []
    let totalDistributed = 0

    for (const reward of distribution) {
      try {
        // Transfer from server wallet to player using CDP wallet
        const result = await distributeReward(
          reward.address,
          reward.amount,
          `Reward for position ${reward.position} (${reward.percentage}%)`
        )

        if (result.success) {
          console.log(`Direct transfer to ${reward.address}: ${reward.amount} ETH`, {
            position: reward.position,
            percentage: reward.percentage,
            transactionHash: result.transactionHash
          })

          transferResults.push({
            address: reward.address,
            position: reward.position,
            amount: reward.amount,
            transactionHash: result.transactionHash,
            status: 'success'
          })

          totalDistributed += parseFloat(reward.amount)
        } else {
          throw new Error(result.error || 'Transfer failed')
        }

      } catch (transferError) {
        console.error(`Failed to transfer to ${reward.address}:`, transferError)
        
        transferResults.push({
          address: reward.address,
          position: reward.position,
          amount: reward.amount,
          status: 'failed',
          error: transferError instanceof Error ? transferError.message : 'Unknown error'
        })
      }
    }

    // Send notifications to winners
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/reward-distribution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: transferResults.filter(r => r.status === 'success'),
          weekNumber: Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000)) // Simple week number
        })
      })
    } catch (notificationError) {
      console.error('Failed to send reward notifications:', notificationError)
    }

    // Log distribution summary
    const successfulTransfers = transferResults.filter(r => r.status === 'success').length
    const failedTransfers = transferResults.filter(r => r.status === 'failed').length

    console.log('Reward distribution completed:', {
      timestamp: new Date().toISOString(),
      totalRecipients: distribution.length,
      successfulTransfers,
      failedTransfers,
      totalDistributed,
      targetAmount: totalAmount
    })

    return NextResponse.json({
      success: true,
      summary: {
        totalRecipients: distribution.length,
        successfulTransfers,
        failedTransfers,
        totalDistributed,
        targetAmount: totalAmount
      },
      transfers: transferResults
    })

  } catch (error) {
    console.error('Error distributing rewards:', error)
    return NextResponse.json({ 
      error: 'Failed to distribute rewards',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
