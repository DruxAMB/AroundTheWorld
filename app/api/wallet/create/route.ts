import { NextRequest, NextResponse } from 'next/server';
import { getRewardDistributorWallet } from '@/lib/cdp/cdp-wallet';

export async function POST(request: NextRequest) {
  try {
    // Get or create the server wallet
    const wallet = await getRewardDistributorWallet();
    
    return NextResponse.json({
      success: true,
      serverWalletAddress: wallet.address,
      smartAccountAddress: wallet.smartAccount.address,
    });
  } catch (error) {
    console.error('❌ Failed to create/get server wallet:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
