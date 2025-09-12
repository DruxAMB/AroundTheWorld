import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

interface LeaderboardEntry {
  address: string
  score: number
  position: number
}

interface RawLeaderboardEntry {
  playerId: string
  score: number
  name?: string
  address?: string
}

interface RewardDistribution {
  address: string
  position: number
  percentage: number
  amount: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CALCULATE REWARDS API START ===')
    console.log('Request method:', request.method)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    const requestBody = await request.json()
    console.log('Request body:', requestBody)
    const { weeklyRewardPool } = requestBody

    if (!weeklyRewardPool) {
      console.error('Missing weeklyRewardPool in request body')
      return NextResponse.json({ error: 'weeklyRewardPool is required' }, { status: 400 })
    }

    console.log('Weekly reward pool:', weeklyRewardPool)

    // Fetch current leaderboard data
    const leaderboardUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/leaderboard`
    console.log('Fetching leaderboard from:', leaderboardUrl)
    
    const leaderboardResponse = await fetch(leaderboardUrl, {
      method: 'GET'
    })
    
    console.log('Leaderboard response status:', leaderboardResponse.status)
    console.log('Leaderboard response headers:', Object.fromEntries(leaderboardResponse.headers.entries()))
    
    if (!leaderboardResponse.ok) {
      const errorText = await leaderboardResponse.text()
      console.error('Leaderboard API error:', leaderboardResponse.status, leaderboardResponse.statusText)
      console.error('Leaderboard error response:', errorText)
      return NextResponse.json({ error: 'Failed to fetch leaderboard data' }, { status: 500 })
    }
    
    const leaderboardData = await leaderboardResponse.json()
    console.log('Leaderboard data structure:', {
      hasLeaderboard: !!leaderboardData.leaderboard,
      leaderboardLength: leaderboardData.leaderboard?.length || 0,
      globalStats: leaderboardData.globalStats,
      keys: Object.keys(leaderboardData)
    })
    
    if (!leaderboardData.leaderboard) {
      console.error('No leaderboard array in response')
      return NextResponse.json({ error: 'No leaderboard data available' }, { status: 500 })
    }

    const leaderboard: LeaderboardEntry[] = leaderboardData.leaderboard
      .slice(0, 15) // Only process top 15 players (reward eligible positions)
      .map((entry: RawLeaderboardEntry, index: number) => {
        console.log(`Processing leaderboard entry ${index + 1}:`, {
          playerId: entry.playerId,
          score: entry.score,
          name: entry.name,
          keys: Object.keys(entry)
        })
        return {
          address: entry.playerId,
          score: entry.score,
          position: index + 1
        }
      })

    console.log('Processed leaderboard entries:', leaderboard.length)
    console.log('First 3 entries:', leaderboard.slice(0, 3))

    // Prepare Gemini AI prompt
    const prompt = `
You are an AI agent managing weekly reward distribution for the AroundTheWorld game.

LEADERBOARD DATA:
${leaderboard.map(entry => `Position ${entry.position}: ${entry.address} (Score: ${entry.score})`).join('\n')}

REWARD POOL: ${weeklyRewardPool} ETH

DISTRIBUTION RULES (FIXED POSITION-BASED SYSTEM):
- 1st place: 20% of reward pool
- 2nd place: 15% of reward pool
- 3rd place: 10% of reward pool
- 4th-6th place: 8% each of reward pool
- 7th-8th place: 6% each of reward pool
- 9th-10th place: 4% each of reward pool
- 11th-15th place: 2.2% each of reward pool
- 16th+ place: No rewards

REQUIREMENTS:
1. Apply the exact percentages above based on player position
2. Calculate ETH amounts by multiplying percentage by reward pool
3. Ensure total distribution equals exactly ${weeklyRewardPool} ETH
4. Round amounts to 6 decimal places for precision
5. Only include players in positions 1-15 (qualifying positions)

Return a JSON response with this exact structure:
{
  "totalPlayers": number,
  "qualifyingPlayers": number,
  "totalDistributed": "${weeklyRewardPool}",
  "rewards": [
    {
      "address": "0x...",
      "position": 1,
      "percentage": 20.0,
      "amount": "0.020000"
    }
  ],
  "reasoning": "Brief explanation of the distribution logic"
}
`

    // Get AI recommendation
    console.log('=== CALLING GEMINI AI ===')
    console.log('Gemini API Key exists:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    console.log('Prompt length:', prompt.length)
    console.log('Prompt preview:', prompt.substring(0, 200) + '...')

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' })
    
    let result, aiResponse
    try {
      console.log('Generating content with Gemini...')
      result = await model.generateContent(prompt)
      aiResponse = result.response.text()
      console.log('AI Response received, length:', aiResponse.length)
      console.log('AI Response preview:', aiResponse.substring(0, 300))
    } catch (aiError) {
      console.error('Gemini AI error:', aiError)
      console.error('AI Error details:', {
        message: aiError instanceof Error ? aiError.message : 'Unknown error',
        stack: aiError instanceof Error ? aiError.stack : undefined
      })
      return NextResponse.json({ error: 'Failed to get AI recommendation' }, { status: 500 })
    }

    // Parse AI response
    let distributionData
    try {
      console.log('=== PARSING AI RESPONSE ===')
      // Extract JSON from AI response (remove any markdown formatting)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        console.log('Found JSON match, length:', jsonMatch[0].length)
        distributionData = JSON.parse(jsonMatch[0])
        console.log('Parsed distribution data:', {
          totalPlayers: distributionData.totalPlayers,
          qualifyingPlayers: distributionData.qualifyingPlayers,
          totalDistributed: distributionData.totalDistributed,
          rewardsCount: distributionData.rewards?.length || 0
        })
      } else {
        console.error('No JSON match found in AI response')
        throw new Error('No valid JSON found in AI response')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Raw AI response:', aiResponse)
      return NextResponse.json({ error: 'Failed to parse AI recommendation' }, { status: 500 })
    }

    // Validate distribution
    console.log('=== VALIDATING DISTRIBUTION ===')
    let totalDistributed = 0
    try {
      totalDistributed = distributionData.rewards.reduce((sum: number, reward: RewardDistribution) => {
        console.log(`Reward for ${reward.address}: ${reward.percentage}% = ${reward.amount} ETH`)
        return sum + parseFloat(reward.amount)
      }, 0)
      console.log('Total distributed:', totalDistributed)
      console.log('Expected pool:', weeklyRewardPool)
    } catch (validationError) {
      console.error('Error during validation:', validationError)
      console.error('Distribution data structure:', distributionData)
      return NextResponse.json({ error: 'Invalid reward distribution data' }, { status: 500 })
    }

    if (Math.abs(totalDistributed - weeklyRewardPool) > 0.000001) {
      console.warn(`Distribution mismatch: ${totalDistributed} vs ${weeklyRewardPool}`)
    }

    // Log AI decision for admin review
    console.log('=== AI REWARD DISTRIBUTION DECISION ===')
    const decisionLog = {
      timestamp: new Date().toISOString(),
      weeklyRewardPool,
      totalPlayers: leaderboard.length,
      qualifyingPlayers: distributionData.qualifyingPlayers,
      totalDistributed,
      reasoning: distributionData.reasoning
    }
    console.log('Decision log:', decisionLog)

    console.log('=== CALCULATE REWARDS API SUCCESS ===')
    return NextResponse.json({
      success: true,
      ...distributionData,
      aiReasoning: distributionData.reasoning
    })

  } catch (error) {
    console.error('=== CALCULATE REWARDS API ERROR ===')
    console.error('Error calculating rewards:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error type:', typeof error)
    console.error('Error constructor:', error?.constructor?.name)
    
    return NextResponse.json({ 
      error: 'Failed to calculate reward distribution',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
