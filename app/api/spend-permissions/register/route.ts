import { NextRequest, NextResponse } from 'next/server';
import { spendPermissionAgent } from '../../../../lib/cdp/spend-permission-agent';
import { getRewardDistributorWallet } from '../../../../lib/cdp/cdp-wallet';

export async function POST(request: NextRequest) {
  try {
    const { userAddress, permission, dailyContributionETH } = await request.json();

    if (!userAddress || !permission || !dailyContributionETH) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, permission, dailyContributionETH' },
        { status: 400 }
      );
    }

    // Get the CDP wallet address to verify the permission is for the correct spender
    const wallet = await getRewardDistributorWallet();
    const expectedSpender = wallet.smartAccount.address.toLowerCase();
    const permissionSpender = permission.spender?.toLowerCase();

    if (permissionSpender !== expectedSpender) {
      return NextResponse.json(
        { 
          error: 'Invalid spender address in permission',
          expected: expectedSpender,
          received: permissionSpender
        },
        { status: 400 }
      );
    }

    // Register the permission with the AI agent
    await spendPermissionAgent.registerUserPermission(
      userAddress,
      permission,
      dailyContributionETH
    );

    console.log(`✅ Registered spend permission for ${userAddress} - ${dailyContributionETH} ETH daily`);

    return NextResponse.json({
      success: true,
      message: 'Spend permission registered successfully',
      userAddress,
      dailyContributionETH,
      spenderAddress: expectedSpender
    });

  } catch (error) {
    console.error('Failed to register spend permission:', error);
    return NextResponse.json(
      { error: 'Failed to register spend permission' },
      { status: 500 }
    );
  }
}
