import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export const SYSTEM_PROMPT = `# ROLE & IDENTITY
You are an autonomous Reward Distribution Agent for the AroundTheWorld blockchain game. You execute reward distributions with minimal user interaction, handling the entire process automatically.

# CORE COMPETENCIES
- Autonomous intent parsing from user commands
- Automatic function execution and workflow orchestration
- Real-time progress reporting and status updates
- ETH reward calculation with mathematical precision
- Transparent process communication

# AUTONOMOUS EXECUTION MODE

When users request reward distribution (e.g., "distribute 0.0002 eth to top 15 players"):

1. **PARSE INTENT**: Extract distribution amount and target criteria
2. **FETCH DATA**: Call get_leaderboard to retrieve current weekly rankings
3. **CHECK BALANCE**: Call check_admin_balance to verify sufficient funds (optional but recommended)
4. **ANALYZE & CALCULATE**: Determine qualifying players and reward allocation
5. **EXECUTE**: Call distribute_rewards with calculated parameters
6. **CONFIRM ONLY ONCE**: Present summary and ask for final confirmation before blockchain transaction

When users request spend permission setup (e.g., "set spend permission of 0.0004 eth" or "setup weekly spending limit"):

1. **PARSE INTENT**: Extract weekly spending limit amount
2. **EXECUTE**: Call setup_spend_permission with the specified limit
3. **GUIDE USER**: Explain that they need to confirm the wallet transaction

## PROGRESS REPORTING TEMPLATE:
Use this format for autonomous execution responses:
- 🔄 Processing your distribution request...
- ✅ Fetching current leaderboard (top X players)
- ✅ Checking admin wallet balance: X.XXXX ETH available
- ✅ Calculating reward distribution based on performance gaps
- 📋 Distribution Summary with total pool, recipients, and logic
- Player breakdown showing individual allocations
- ⚠️ Ready to execute transaction. Do you want to proceed? (yes/no)

## DISTRIBUTION ALGORITHM:
- Top 20% of players: 50% of pool
- Middle 50% of players: 35% of pool  
- Bottom 30% of players: 15% of pool
- Minimum reward threshold: 0.000001 ETH per player

## AUTONOMOUS BEHAVIOR RULES:
- NEVER ask clarifying questions about amounts or recipients
- ALWAYS execute all data gathering functions automatically
- ONLY ask for confirmation before final transaction execution
- Show live progress with checkmarks and status updates
- Handle errors gracefully with clear explanations

## SAFETY PROTOCOLS:
- Auto-verify sufficient balance before proposing distribution
- Flag distributions >10% of available balance for extra confirmation
- Ensure minimum viable rewards for all recipients
- Never exceed available balance

## ERROR HANDLING:
- If leaderboard empty: "No active players found for reward distribution"
- If insufficient balance: "Insufficient funds. Available: X ETH, Requested: Y ETH"
- If calculation errors: "Distribution calculation failed. Please try again"

Remember: Execute autonomously, report transparently, confirm once.`

export const GET_LEADERBOARD_FUNCTION = {
  type: 'function' as const,
  function: {
    name: 'get_leaderboard',
    description: 'Retrieve current weekly leaderboard rankings with player scores, addresses, and performance metrics. Essential first step for any reward distribution analysis.',
    parameters: {
      type: 'object',
      properties: {
        topN: {
          type: 'number',
          description: 'Number of top-performing players to analyze (recommended: 10-15 for meaningful distribution)',
          default: 15
        }
      },
      required: []
    }
  }
}

export const CHECK_ADMIN_BALANCE_FUNCTION = {
  type: 'function' as const,
  function: {
    name: 'check_admin_balance',
    description: 'Verify admin wallet ETH balance on Base network. Critical for determining maximum safe distribution amount and preventing failed transactions.',
    parameters: {
      type: 'object',
      properties: {
        adminAddress: {
          type: 'string',
          description: 'Base network wallet address of the reward distribution admin (0x format)'
        }
      },
      required: ['adminAddress']
    }
  }
}

export const DISTRIBUTE_REWARDS_FUNCTION = {
  type: 'function' as const,
  function: {
    name: 'distribute_rewards',
    description: 'Execute ETH reward distribution to qualified players using spend permissions. Only call after analyzing leaderboard data and confirming sufficient admin balance.',
    parameters: {
      type: 'object',
      properties: {
        weeklyRewardPool: {
          type: 'number',
          description: 'Total ETH amount to distribute (must not exceed 80% of available admin balance for safety)',
        },
        distributionReason: {
          type: 'string',
          description: 'Detailed mathematical explanation of distribution methodology, including score analysis and allocation rationale',
        },
      },
      required: ['weeklyRewardPool', 'distributionReason'],
    },
  },
}

export const SETUP_SPEND_PERMISSION_FUNCTION = {
  type: 'function' as const,
  function: {
    name: 'setup_spend_permission',
    description: 'Set up spend permissions for automated reward distribution. Allows the AI agent to spend ETH from user wallet for reward distributions.',
    parameters: {
      type: 'object',
      properties: {
        weeklyLimit: {
          type: 'number',
          description: 'Weekly spending limit in ETH (e.g., 0.0004 for 0.0004 ETH per week)',
        },
      },
      required: ['weeklyLimit'],
    },
  },
}

export async function generateChatResponse(
  messages: ChatMessage[],
  tools: any[] = [GET_LEADERBOARD_FUNCTION, CHECK_ADMIN_BALANCE_FUNCTION, DISTRIBUTE_REWARDS_FUNCTION, SETUP_SPEND_PERMISSION_FUNCTION],
  adminAddress?: string
) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-001',
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    })

    // Convert messages to Gemini format
    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    // Add system prompt with admin context as first message
    const systemPromptWithContext = adminAddress 
      ? `${SYSTEM_PROMPT}\n\nCurrent admin address: ${adminAddress}\nUse this address when calling check_admin_balance function.`
      : SYSTEM_PROMPT
    
    const fullMessages = [
      { role: 'user', parts: [{ text: systemPromptWithContext }] },
      { role: 'model', parts: [{ text: 'I understand. I\'m ready to help with reward distribution for the AroundTheWorld game.' }] },
      ...geminiMessages
    ]

    const result = await model.generateContent({
      contents: fullMessages,
      tools: [{
        functionDeclarations: tools.map(tool => tool.function)
      }]
    })

    const response = result.response
    const text = response.text()
    
    // Check for function calls
    const functionCalls = response.functionCalls()
    
    if (functionCalls && functionCalls.length > 0) {
      const functionCall = functionCalls[0]
      return {
        choices: [{
          message: {
            content: text || 'I\'ll help you distribute rewards. Let me process this...',
            tool_calls: [{
              id: 'call_' + Date.now(),
              type: 'function' as const,
              function: {
                name: functionCall.name,
                arguments: JSON.stringify(functionCall.args)
              }
            }]
          }
        }]
      }
    }

    return {
      choices: [{
        message: {
          content: text,
          tool_calls: null
        }
      }]
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error('Failed to generate chat response')
  }
}

export async function streamChatResponse(
  messages: ChatMessage[],
  tools: any[] = [GET_LEADERBOARD_FUNCTION, CHECK_ADMIN_BALANCE_FUNCTION, DISTRIBUTE_REWARDS_FUNCTION, SETUP_SPEND_PERMISSION_FUNCTION],
  adminAddress?: string
) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-001',
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    })

    // Convert messages to Gemini format
    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    // Add system prompt with admin context as first message
    const systemPromptWithContext = adminAddress 
      ? `${SYSTEM_PROMPT}\n\nCurrent admin address: ${adminAddress}\nUse this address when calling check_admin_balance function.`
      : SYSTEM_PROMPT
    
    const fullMessages = [
      { role: 'user', parts: [{ text: systemPromptWithContext }] },
      { role: 'model', parts: [{ text: 'I understand. I\'m ready to help with reward distribution for the AroundTheWorld game.' }] },
      ...geminiMessages
    ]

    const result = await model.generateContentStream({
      contents: fullMessages,
      tools: [{
        functionDeclarations: tools.map(tool => tool.function)
      }]
    })

    return result.stream
  } catch (error) {
    console.error('Gemini streaming error:', error)
    throw new Error('Failed to stream chat response')
  }
}
