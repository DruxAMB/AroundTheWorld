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

export const SYSTEM_PROMPT = `You are a helpful AI assistant that manages reward distribution for the AroundTheWorld game. 

When a user asks you to distribute rewards, you should:
1. Analyze the current leaderboard positions and scores
2. Calculate fair reward percentages based on performance
3. Use the distribute_rewards function to execute the distribution
4. Confirm the distribution details with the user

You have access to spend permissions which allow you to distribute USDC rewards to top players based on their leaderboard positions.

Be friendly, helpful, and always explain your reward distribution logic clearly.`

export const DISTRIBUTE_REWARDS_FUNCTION = {
  type: 'function' as const,
  function: {
    name: 'distribute_rewards',
    description: 'Distribute USDC rewards to top players based on leaderboard positions',
    parameters: {
      type: 'object',
      properties: {
        weeklyRewardPool: {
          type: 'number',
          description: 'The total weekly reward pool amount in USDC',
        },
        distributionReason: {
          type: 'string',
          description: 'Brief explanation of the distribution logic used',
        },
      },
      required: ['weeklyRewardPool', 'distributionReason'],
    },
  },
}

export async function generateChatResponse(
  messages: ChatMessage[],
  tools: any[] = [DISTRIBUTE_REWARDS_FUNCTION]
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

    // Add system prompt as first message
    const fullMessages = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
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
  tools: any[] = [DISTRIBUTE_REWARDS_FUNCTION]
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

    // Add system prompt as first message
    const fullMessages = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
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
