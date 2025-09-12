import { NextRequest, NextResponse } from 'next/server'
import { executeSpendPermissionAndDistribute} from '@/lib/cdp/cdp'
import { parseUnits } from 'viem'

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

    // Debug: Log the actual spend permission structure
    console.log('Received spend permission structure:', {
      keys: Object.keys(spendPermission),
      hasPermissionField: !!spendPermission.permission,
      structure: spendPermission
    })

    // Validate spend permission structure - the actual permission data is nested
    if (!spendPermission || typeof spendPermission !== 'object') {
      return NextResponse.json({ error: 'Invalid spend permission: not an object' }, { status: 400 })
    }

    // Extract the actual permission object from the nested structure
    const permission = spendPermission.permission || spendPermission
    
    if (!permission || typeof permission !== 'object') {
      return NextResponse.json({ error: 'Invalid permission object in spend permission' }, { status: 400 })
    }

    // Check for required fields in the permission object
    if (!permission.account || !permission.spender || !permission.allowance) {
      return NextResponse.json({ 
        error: 'Invalid spend permission structure', 
        details: `Missing required fields in permission object. Available fields: ${Object.keys(permission).join(', ')}`,
        received: permission
      }, { status: 400 })
    }

    // Verify admin address matches permission account
    if (permission.account.toLowerCase() !== adminAddress.toLowerCase()) {
      return NextResponse.json({ 
        error: 'Admin address does not match spend permission account',
        details: `Expected: ${adminAddress}, Got: ${permission.account}`
      }, { status: 400 })
    }

    console.log('Starting atomic spend permission + reward distribution:', {
      totalRecipients: distribution.length,
      totalAmount,
      adminAddress,
      permissionDetails: {
        account: permission.account,
        spender: permission.spender,
        allowance: permission.allowance,
        token: permission.token
      }
    })

    // Prepare spend permission calls to pull USDC from admin wallet
    const spendPermissionCalls = [{
      to: permission.spender, // Server wallet address that will pull funds
      data: permission.signature || permission.data || '0x' // Spend permission execution data
    }]

    // Convert reward amounts to USDC (6 decimals)
    const usdcDistributions = distribution.map(reward => ({
      address: reward.address,
      amount: parseUnits(reward.amount, 6).toString() // Convert to USDC wei (6 decimals)
    }))

    console.log('Executing atomic spend permission + distribution transaction')
    
    // Execute atomic transaction: pull funds + distribute rewards
    const result = await executeSpendPermissionAndDistribute(
      spendPermissionCalls,
      usdcDistributions,
      adminAddress
    )

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Failed to execute spend permission and distribution',
        details: result.error
      }, { status: 500 })
    }

    // Prepare transfer results for response
    const transferResults = distribution.map(reward => ({
      address: reward.address,
      position: reward.position,
      amount: reward.amount,
      transactionHash: result.transactionHash,
      status: 'success'
    }))

    const totalDistributed = distribution.reduce((sum, reward) => sum + parseFloat(reward.amount), 0)

    // Send notifications to winners
    try {
      await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/notifications/reward-distribution`, {
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
