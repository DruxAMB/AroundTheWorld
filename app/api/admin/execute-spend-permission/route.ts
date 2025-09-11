import { NextRequest, NextResponse } from 'next/server'
import { getServerWalletForUser, getCdpClient } from '@/lib/cdp/cdp'

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

    const { spendCalls } = await request.json()

    if (!spendCalls) {
      return NextResponse.json({ error: 'Missing spendCalls' }, { status: 400 })
    }

    // Get existing server wallet
    const serverWallet = getServerWalletForUser(userAddress)
    if (!serverWallet) {
      return NextResponse.json({ 
        error: 'Server wallet not found in memory (possibly due to server restart). Please re-setup your spend permissions.' 
      }, { status: 400 })
    }

    console.log(`Processing spend permission execution for user: ${userAddress}`)

    // Execute spend permission calls using CDP's sendUserOperation with gas sponsorship
    if (!serverWallet.smartAccount) {
      return NextResponse.json({ 
        error: 'Smart account not found. Please re-setup your spend permissions.' 
      }, { status: 400 })
    }

    const cdpClient = getCdpClient();
    
    // Debug logging for spend permission execution
    console.log('🔧 Spend permission execution debug info:');
    console.log('  - User address:', userAddress);
    console.log('  - Server wallet address:', serverWallet.address);
    console.log('  - Smart account available:', !!serverWallet.smartAccount);
    console.log('  - Number of spend calls:', spendCalls.length);
    console.log('  - Spend calls details:', JSON.stringify(spendCalls, null, 2));
    console.log('  - Paymaster URL:', process.env.PAYMASTER_URL);
    
    // Validate spend calls structure
    for (const [index, call] of spendCalls.entries()) {
      if (!call.to || !call.data) {
        console.error(`❌ Invalid spend call at index ${index}:`, call);
        return NextResponse.json({ 
          error: `Invalid spend call structure at index ${index}. Missing 'to' or 'data' field.` 
        }, { status: 400 });
      }
      console.log(`  - Call ${index}: to=${call.to}, data length=${call.data.length}`);
    }
    
    console.log('🔧 Sending user operation with spend calls...');
    const result = await cdpClient.evm.sendUserOperation({
      smartAccount: serverWallet.smartAccount,
      network: "base-sepolia", // Changed from "base" to "base-sepolia" to match testnet
      calls: spendCalls.map((call: any) => ({
        to: call.to,
        data: call.data,
      })),
      paymasterUrl: process.env.PAYMASTER_URL,
    });
    
    console.log('✅ Spend permission execution successful:', result);

    return NextResponse.json({
      success: true,
      message: 'Spend permission executed successfully',
      transactionHash: result.userOpHash,
      result
    })

  } catch (error) {
    console.error('Spend permission execution error:', error)
    return NextResponse.json({ error: 'Failed to execute spend permission' }, { status: 500 })
  }
}
