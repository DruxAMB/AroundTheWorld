import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface LeaderboardEntry {
  address: string
  score: number
  position: number
}

interface RewardDistribution {
  address: string
  position: number
  percentage: number
  amount: string
}

export async function POST(request: NextRequest) {
  try {
    const { weeklyRewardPool } = await request.json()

    // Fetch current leaderboard data
    const leaderboardResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/leaderboard`)
    
    if (!leaderboardResponse.ok) {
      console.error('Leaderboard API error:', leaderboardResponse.status, leaderboardResponse.statusText)
      return NextResponse.json({ error: 'Failed to fetch leaderboard data' }, { status: 500 })
    }
    
    const leaderboardData = await leaderboardResponse.json()
    
    if (!leaderboardData.leaderboard) {
      return NextResponse.json({ error: 'No leaderboard data available' }, { status: 500 })
    }

    const leaderboard: LeaderboardEntry[] = leaderboardData.leaderboard
      .map((entry: any, index: number) => ({
        address: entry.walletAddress,
        score: entry.totalScore,
        position: index + 1
      }))
      .slice(0, 50) // Top 50 players

    // Prepare Gemini AI prompt
    const prompt = `
You are an AI agent managing weekly reward distribution for the AroundTheWorld game.

LEADERBOARD DATA:
${leaderboard.map(entry => `Position ${entry.position}: ${entry.address} (Score: ${entry.score})`).join('\n')}

REWARD POOL: ${weeklyRewardPool} ETH

DISTRIBUTION RULES:
- Top 10% of players get 50% of the reward pool
- Next 20% of players get 30% of the reward pool  
- Next 30% of players get 20% of the reward pool
- Remaining players get no rewards (to maintain exclusivity)

REQUIREMENTS:
1. Calculate exact percentages for each qualifying player
2. Ensure total distribution equals exactly ${weeklyRewardPool} ETH
3. Round amounts to 6 decimal places for precision
4. Only include players who qualify for rewards

Return a JSON response with this exact structure:
{
  "totalPlayers": number,
  "qualifyingPlayers": number,
  "totalDistributed": "${weeklyRewardPool}",
  "rewards": [
    {
      "address": "0x...",
      "position": 1,
      "percentage": 8.33,
      "amount": "0.008330"
    }
  ],
  "reasoning": "Brief explanation of the distribution logic"
}
`

    // Get AI recommendation
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' })
    const result = await model.generateContent(prompt)
    const aiResponse = result.response.text()

    // Parse AI response
    let distributionData
    try {
      // Extract JSON from AI response (remove any markdown formatting)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        distributionData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No valid JSON found in AI response')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      return NextResponse.json({ error: 'Failed to parse AI recommendation' }, { status: 500 })
    }

    // Validate distribution
    const totalDistributed = distributionData.rewards.reduce((sum: number, reward: RewardDistribution) => {
      return sum + parseFloat(reward.amount)
    }, 0)

    if (Math.abs(totalDistributed - weeklyRewardPool) > 0.000001) {
      console.warn(`Distribution mismatch: ${totalDistributed} vs ${weeklyRewardPool}`)
    }

    // Log AI decision for admin review
    console.log('AI Reward Distribution Decision:', {
      timestamp: new Date().toISOString(),
      weeklyRewardPool,
      totalPlayers: leaderboard.length,
      qualifyingPlayers: distributionData.qualifyingPlayers,
      totalDistributed,
      reasoning: distributionData.reasoning
    })

    return NextResponse.json({
      success: true,
      ...distributionData,
      aiReasoning: distributionData.reasoning
    })

  } catch (error) {
    console.error('Error calculating rewards:', error)
    return NextResponse.json({ 
      error: 'Failed to calculate reward distribution',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
