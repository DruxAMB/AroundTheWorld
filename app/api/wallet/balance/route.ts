import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address parameter required' }, { status: 400 });
    }

    // Validate address format
    if (!address.startsWith('0x') || address.length !== 42) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }

    // Get ETH balance
    const balance = await publicClient.getBalance({
      address: address as `0x${string}`
    });

    // Convert from wei to ETH
    const balanceEth = (Number(balance) / 1e18).toFixed(6);

    return NextResponse.json({
      address,
      balance: balanceEth,
      balanceWei: balance.toString()
    });

  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch wallet balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
