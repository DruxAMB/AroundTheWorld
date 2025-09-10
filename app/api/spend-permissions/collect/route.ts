import { NextRequest, NextResponse } from 'next/server';
import { spendPermissionAgent } from '../../../../lib/cdp/spend-permission-agent';

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 AI Agent: Manual collection triggered via API');

    // Execute automated collection
    const result = await spendPermissionAgent.collectDailyContributions();

    // Check if we should trigger reward distribution
    const shouldDistribute = await spendPermissionAgent.shouldTriggerRewardDistribution();

    return NextResponse.json({
      success: true,
      message: 'Collection completed',
      ...result,
      shouldTriggerRewardDistribution: shouldDistribute
    });

  } catch (error) {
    console.error('Failed to collect contributions:', error);
    return NextResponse.json(
      { error: 'Failed to collect contributions' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current registered permissions
    const permissions = spendPermissionAgent.getRegisteredPermissions();
    
    // Check if collection should be triggered
    const shouldDistribute = await spendPermissionAgent.shouldTriggerRewardDistribution();

    return NextResponse.json({
      registeredPermissions: permissions.length,
      permissions: permissions.map(p => ({
        userAddress: p.userAddress,
        dailyContribution: p.dailyContribution,
        lastCollected: p.lastCollected,
        hoursUntilNextCollection: Math.max(0, 24 - ((Date.now() - p.lastCollected.getTime()) / (1000 * 60 * 60)))
      })),
      shouldTriggerRewardDistribution: shouldDistribute
    });

  } catch (error) {
    console.error('Failed to get collection status:', error);
    return NextResponse.json(
      { error: 'Failed to get collection status' },
      { status: 500 }
    );
  }
}
