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

    // Generate chat response with function calling
    const response = await generateChatResponse(messages as ChatMessage[], undefined, adminAddress)
    
    const choice = response.choices[0]
    
    if (choice.message.tool_calls) {
      // Handle function calls
      const toolCall = choice.message.tool_calls[0]
      
      if (toolCall.function.name === 'get_leaderboard') {
        // Fetch leaderboard data and return it to the AI
        const args = JSON.parse(toolCall.function.arguments)
        const topN = args.topN || 15
        
        try {
          const leaderboardUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/leaderboard`
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
              name: entry.name || `Player ${index + 1}`
            }))
          
          // Continue the conversation with leaderboard data
          const updatedMessages = [...messages, {
            role: 'assistant' as const,
            content: `I've fetched the current leaderboard. Here are the top ${topN} players:\n\n${topPlayers.map((p: any) => `${p.position}. ${p.name} - Score: ${p.score} (${p.address.slice(0,6)}...${p.address.slice(-4)})`).join('\n')}\n\nNow I can calculate fair reward distributions based on these scores.`
          }]
          
          // Generate follow-up response with leaderboard context
          const followUpResponse = await generateChatResponse(updatedMessages)
          const followUpChoice = followUpResponse.choices[0]
          
          if (followUpChoice.message.tool_calls) {
            const followUpToolCall = followUpChoice.message.tool_calls[0]
            if (followUpToolCall.function.name === 'distribute_rewards') {
              return NextResponse.json({
                message: followUpChoice.message.content || 'Based on the leaderboard data, I\'ll now distribute the rewards proportionally.',
                toolCall: true,
                details: {
                  function: {
                    name: followUpToolCall.function.name,
                    arguments: followUpToolCall.function.arguments,
                  },
                  leaderboardData: topPlayers
                },
              })
            }
          }
          
          return NextResponse.json({
            message: followUpChoice.message.content,
            toolCall: false,
            leaderboardData: topPlayers
          })
          
        } catch (error) {
          console.error('Error fetching leaderboard:', error)
          return NextResponse.json({
            message: 'I encountered an error fetching the leaderboard data. Please try again.',
            toolCall: false
          })
        }
      }
      
      if (toolCall.function.name === 'check_admin_balance') {
        // Check admin wallet balance
        const args = JSON.parse(toolCall.function.arguments)
        const adminAddress = args.adminAddress
        
        try {
          const balanceUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/wallet/balance?address=${adminAddress}`
          const balanceResponse = await fetch(balanceUrl)
          
          if (!balanceResponse.ok) {
            throw new Error('Failed to fetch admin balance')
          }
          
          const balanceData = await balanceResponse.json()
          const balance = balanceData.balance || '0'
          
          // Continue the conversation with balance data
          const updatedMessages = [...messages, {
            role: 'assistant' as const,
            content: `I've checked the admin wallet balance. Current balance: ${balance} ETH (${adminAddress.slice(0,6)}...${adminAddress.slice(-4)}). This will help me determine appropriate reward amounts.`
          }]
          
          // Generate follow-up response with balance context
          const followUpResponse = await generateChatResponse(updatedMessages)
          const followUpChoice = followUpResponse.choices[0]
          
          if (followUpChoice.message.tool_calls) {
            const followUpToolCall = followUpChoice.message.tool_calls[0]
            if (followUpToolCall.function.name === 'distribute_rewards') {
              return NextResponse.json({
                message: followUpChoice.message.content || 'Based on the available balance, I\'ll now calculate appropriate reward distributions.',
                toolCall: true,
                details: {
                  function: {
                    name: followUpToolCall.function.name,
                    arguments: followUpToolCall.function.arguments,
                  },
                  adminBalance: balance
                },
              })
            }
          }
          
          return NextResponse.json({
            message: followUpChoice.message.content,
            toolCall: false,
            adminBalance: balance
          })
          
        } catch (error) {
          console.error('Error fetching admin balance:', error)
          return NextResponse.json({
            message: 'I encountered an error checking the admin wallet balance. Please try again.',
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
    }
    
    // Regular chat response
    return NextResponse.json({
      message: choice.message.content,
      toolCall: false,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 })
  }
}
