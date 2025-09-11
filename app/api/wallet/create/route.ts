import { NextRequest, NextResponse } from 'next/server'
import { createServerWalletForUser, getServerWalletForUser } from '@/lib/cdp/cdp'

export async function POST(request: NextRequest) {
  try {
    // Get session from cookie
    const session = request.cookies.get('session')?.value
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Decode user address from session
    const [userAddress] = Buffer.from(session, 'base64').toString().split(':')
    if (!userAddress) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    console.log('Creating server wallet for authenticated user:', userAddress)

    // Get or create server wallet for user (Base demo pattern)
    let serverWallet = getServerWalletForUser(userAddress)
    if (!serverWallet?.smartAccount) {
      serverWallet = await createServerWalletForUser(userAddress)
    }

    return NextResponse.json({
      ok: true,
      serverWalletAddress: serverWallet.address,
      smartAccountAddress: serverWallet.smartAccount?.address,
      message: 'Server wallet ready'
    })

  } catch (error) {
    console.error('Wallet creation error:', error)
    return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get session from cookie
    const session = request.cookies.get('session')?.value
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Decode user address from session
    const [userAddress] = Buffer.from(session, 'base64').toString().split(':')
    if (!userAddress) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get existing server wallet for user
    const serverWallet = getServerWalletForUser(userAddress)
    
    return NextResponse.json({
      ok: true,
      serverWalletAddress: serverWallet?.address || null,
      smartAccountAddress: serverWallet?.smartAccount?.address || null,
      exists: !!serverWallet
    })
  } catch (error) {
    console.error('Server wallet fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch server wallet' }, { status: 500 })
  }
}
