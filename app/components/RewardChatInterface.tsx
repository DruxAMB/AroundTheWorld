'use client'

import React, { useState, useRef, useEffect } from 'react'
import { prepareSpendCallData } from '@base-org/account/spend-permission'

interface Message {
  id: string
  content: string
  sender: 'user' | 'agent'
  timestamp: Date
  toolCall?: boolean
  details?: any
}

interface RewardChatInterfaceProps {
  isAuthenticated: boolean
  userAddress?: string
}

export function RewardChatInterface({ isAuthenticated, userAddress }: RewardChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AroundTheWorld reward distribution agent. I can help you distribute USDC rewards to top players based on their leaderboard positions. Just tell me how much you want to distribute and I'll analyze the leaderboard!",
      sender: 'agent',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !isAuthenticated) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Prepare messages for API
      const chatMessages = messages
        .concat([userMessage])
        .filter(m => m.sender === 'user' || m.sender === 'agent')
        .map(m => ({
          role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: chatMessages }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // If this is a tool call (distribute_rewards), we need to handle spend permissions on the frontend
      if (data.toolCall && data.details?.function?.name === 'distribute_rewards') {
        await handleRewardDistribution(data.details.function.arguments)
        return
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message,
        sender: 'agent',
        timestamp: new Date(),
        toolCall: data.toolCall,
        details: data.details,
      }

      setMessages(prev => [...prev, agentMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'agent',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRewardDistribution = async (args: any) => {
    try {
      // Parse the function arguments
      const { weeklyRewardPool, distributionReason } = typeof args === 'string' ? JSON.parse(args) : args

      // Get stored spend permission
      const storedPermission = localStorage.getItem('spendPermission')
      console.log('Stored permission:', storedPermission)
      if (!storedPermission) {
        throw new Error('No spend permission found. Please set up spend permissions first.')
      }

      const permission = JSON.parse(storedPermission)

      // Import spend permission utilities dynamically (client-side only)
      const { getPermissionStatus } = await import('@base-org/account/spend-permission')

      // Check permission status
      const status = await getPermissionStatus(permission)
      const requiredAmountUSDC = BigInt(Math.floor(weeklyRewardPool * 1_000_000))

      if (status.remainingSpend < requiredAmountUSDC) {
        throw new Error(`Insufficient spend permission. Remaining: $${Number(status.remainingSpend) / 1_000_000}`)
      }

      // First, calculate rewards using AI
      const calculateResponse = await fetch('/api/admin/calculate-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          weeklyRewardPool,
          distributionReason
        }),
      })

      const calculateResult = await calculateResponse.json()

      if (!calculateResult.rewards || calculateResult.rewards.length === 0) {
        throw new Error('No rewards calculated. Check if there are qualifying players.')
      }

      // Prepare spend calls on the frontend for the total amount
      const spendCalls = await prepareSpendCallData(permission, requiredAmountUSDC)

      // Execute the distribution with prepared calls
      const distributeResponse = await fetch('/api/admin/execute-spend-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          weeklyRewardPool,
          rewards: calculateResult.rewards,
          spendCalls
        }),
      })

      const distributeResult = await distributeResponse.json()

      const resultMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: distributeResult.success 
          ? `✅ Successfully distributed $${weeklyRewardPool} USDC to ${calculateResult.qualifyingPlayers} players!\n\nDistribution:\n${calculateResult.rewards.map((r: any) => `• Position ${r.position}: $${r.amount} USDC (${r.percentage}%)`).join('\n')}\n\nReason: ${distributionReason}`
          : `❌ Failed to distribute rewards: ${distributeResult.error}`,
        sender: 'agent',
        timestamp: new Date(),
        toolCall: true,
        details: { ...distributeResult, rewards: calculateResult.rewards },
      }

      setMessages(prev => [...prev, resultMessage])

      // Auto-redirect to Base Account activity page after successful distribution
      if (distributeResult.success && distributeResult.transactionHash) {
        setTimeout(() => {
          window.open(`https://basescan.org/tx/${distributeResult.transactionHash}`, '_blank')
        }, 2000)
      }

    } catch (error) {
      console.error('Reward distribution error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ Failed to distribute rewards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'agent',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Please sign in with Base to start chatting with the reward agent.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 bg-white/80 backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-slate-900">Reward Distribution Agent</h2>
        <p className="text-sm text-slate-600">Connected: {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                message.sender === 'user'
                  ? 'bg-blue-600 shadow-blue-100'
                  : 'bg-white border border-slate-200 shadow-slate-100'
              }`}
            >
              <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                message.sender === 'user' ? 'text-white' : 'text-slate-900'
              }`}>{message.content}</p>
              {message.toolCall && message.details && message.details.success && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <p className="font-medium text-green-800 mb-2">🎉 Reward distribution completed!</p>
                  {message.details.transactionHash && (
                    <a 
                      href={`https://basescan.org/tx/${message.details.transactionHash}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                    >
                      View Transaction →
                    </a>
                  )}
                  <p className="text-green-700 text-xs mt-2">Check the transaction on Basescan to see the reward distributions</p>
                  <p className="text-green-700 text-xs mt-2">Total Reward Pool: $50 USDC</p>
                  <p className="text-green-700 text-xs mt-2">Distribution:</p>
                  <ul>
                    <li>1st place: 30% ($15 USDC)</li>
                    <li>2nd place: 20% ($10 USDC)</li>
                    <li>3rd place: 15% ($7.50 USDC)</li>
                    <li>4th place: 12% ($6 USDC)</li>
                    <li>5th place: 10% ($5 USDC)</li>
                    <li>6th place: 8% ($4 USDC)</li>
                    <li>7th place: 6% ($3 USDC)</li>
                    <li>8th place: 5% ($2.50 USDC)</li>
                    <li>9th place: 4% ($2 USDC)</li>
                    <li>10th place: 3% ($1.50 USDC)</li>
                  </ul>
                </div>
              )}
              <p className={`text-xs mt-2 ${
                message.sender === 'user' ? 'text-blue-100' : 'text-slate-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 shadow-slate-100 max-w-xs lg:max-w-md px-4 py-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <div className="animate-pulse flex space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-slate-900">Agent is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-4 bg-white/80 backdrop-blur-sm">
        <div className="flex space-x-3">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to distribute rewards... e.g., 'Distribute $100 USDC to the top players based on their performance'"
            className="flex-1 p-3 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white shadow-sm transition-all duration-200 text-slate-900 placeholder-slate-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span className="font-medium">Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
