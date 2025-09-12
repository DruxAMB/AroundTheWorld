import { NextRequest, NextResponse } from 'next/server'
import { generateChatResponse, ChatMessage } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    // Get session from cookie
    const session = request.cookies.get('session')?.value
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { messages, adminAddress } = await request.json()
    
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages must be an array' }, { status: 400 })
    }

    // Execute autonomous workflow
    return await executeAutonomousWorkflow(messages as ChatMessage[], adminAddress)
    
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 })
  }
}

async function executeAutonomousWorkflow(messages: ChatMessage[], adminAddress?: string) {
  let workflowData: any = {}
  
  // Step 1: Generate initial AI response
  const response = await generateChatResponse(messages, undefined, adminAddress)
  const choice = response.choices[0]
  
  if (!choice.message.tool_calls) {
    // No function calls needed, return regular response
    return NextResponse.json({
      message: choice.message.content,
      toolCall: false,
    })
  }

  // Step 2: Execute function calls autonomously
  const toolCall = choice.message.tool_calls[0]
  
  if (toolCall.function.name === 'get_leaderboard') {
    // Fetch leaderboard data
    const args = JSON.parse(toolCall.function.arguments)
    const topN = args.topN || 15
    
    try {
      const leaderboardUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/leaderboard?timeframe=week&limit=${topN}`
      const leaderboardResponse = await fetch(leaderboardUrl)
      
      if (!leaderboardResponse.ok) {
        throw new Error('Failed to fetch leaderboard')
      }
      
      const leaderboardData = await leaderboardResponse.json()
      const topPlayers = leaderboardData.leaderboard
        .slice(0, topN)
        .map((entry: any, index: number) => ({
          position: index + 1,
          address: entry.playerId,
          score: entry.score,
          name: entry.farcasterProfile?.displayName || entry.name || `Player ${index + 1}`
        }))
      
      workflowData.leaderboard = topPlayers
      
      // Step 3: Auto-check balance if admin address available
      if (adminAddress) {
        try {
          const balanceUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/wallet/balance?address=${adminAddress}`
          const balanceResponse = await fetch(balanceUrl)
          
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json()
            workflowData.adminBalance = balanceData.balance || '0'
          }
        } catch (error) {
          console.log('Balance check failed, proceeding without balance info')
        }
      }
      
      // Step 4: Generate autonomous summary with all data
      const contextMessage = `🔄 Processing your distribution request...

✅ Fetched current leaderboard (top ${topN} players)
${workflowData.adminBalance ? `✅ Checked admin wallet balance: ${workflowData.adminBalance} ETH available` : '⚠️ Admin balance not checked'}
✅ Ready to calculate reward distribution

📋 Top Players:
${topPlayers.slice(0, 10).map((p: any) => `${p.position}. ${p.name} (Score: ${p.score})`).join('\n')}
${topPlayers.length > 10 ? `... and ${topPlayers.length - 10} more players` : ''}

Ready to proceed with distribution calculation. Please confirm the reward amount and I'll execute the distribution.`
      
      return NextResponse.json({
        message: contextMessage,
        toolCall: false,
        workflowData: workflowData
      })
      
    } catch (error) {
      console.error('Error in autonomous workflow:', error)
      return NextResponse.json({
        message: 'I encountered an error processing your request. Please try again.',
        toolCall: false
      })
    }
  }
  
  if (toolCall.function.name === 'distribute_rewards') {
    return NextResponse.json({
      message: choice.message.content || 'I\'ll help you distribute rewards. Let me process this...',
      toolCall: true,
      details: {
        function: {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        }
      },
    })
  }
  
  // Regular chat response
  return NextResponse.json({
    message: choice.message.content,
    toolCall: false,
  })
}
