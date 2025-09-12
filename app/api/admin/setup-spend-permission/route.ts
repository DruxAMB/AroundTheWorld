import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get session from cookie
    const session = request.cookies.get('session')?.value
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { weeklyLimit, userAddress } = await request.json()
    
    if (!weeklyLimit || !userAddress) {
      return NextResponse.json({ error: 'Weekly limit and user address are required' }, { status: 400 })
    }

    // First create server wallet to get the spender address
    const walletResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/wallet/create`, {
      method: 'POST',
    })

    if (!walletResponse.ok) {
      throw new Error('Failed to create server wallet')
    }

    const walletData = await walletResponse.json()
    const spenderAddress = walletData.smartAccountAddress

    if (!spenderAddress) {
      throw new Error('Smart account address not found')
    }

    // Return the configuration needed for the frontend to request spend permission
    return NextResponse.json({
      success: true,
      spenderAddress,
      weeklyLimit,
      message: `Spend permission setup prepared. Weekly limit: ${weeklyLimit} ETH. Please confirm the transaction in your wallet.`
    })

  } catch (error) {
    console.error('Setup spend permission error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to setup spend permission' 
    }, { status: 500 })
  }
}