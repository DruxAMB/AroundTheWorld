import { NextRequest, NextResponse } from 'next/server'

interface RewardRecipient {
  address: string
  position: number
  amount: string
  transactionHash: string
  status: 'success'
}

export async function POST(request: NextRequest) {
  try {
    const { recipients, weekNumber } = await request.json()

    if (!recipients || !Array.isArray(recipients)) {
      return NextResponse.json({ error: 'Invalid recipients data' }, { status: 400 })
    }

    // Filter only successful transfers
    const successfulRecipients = recipients.filter((r: RewardRecipient) => r.status === 'success')

    console.log('Sending reward notifications:', {
      weekNumber,
      totalRecipients: successfulRecipients.length,
      timestamp: new Date().toISOString()
    })

    // Create notification messages for each recipient
    const notifications = successfulRecipients.map((recipient: RewardRecipient) => ({
      address: recipient.address,
      title: '🎉 Weekly Reward Earned!',
      message: `Congratulations! You finished #${recipient.position} this week and earned ${recipient.amount} ETH!`,
      type: 'reward',
      metadata: {
        position: recipient.position,
        amount: recipient.amount,
        transactionHash: recipient.transactionHash,
        weekNumber
      }
    }))

    // Here you would integrate with your existing notification system
    // For now, we'll just log the notifications
    notifications.forEach(notification => {
      console.log(`Reward notification for ${notification.address}:`, {
        position: notification.metadata.position,
        amount: notification.metadata.amount,
        transactionHash: notification.metadata.transactionHash
      })
    })

    // TODO: Integrate with existing competitive-notifications.ts system
    // You could call your existing notification functions here:
    // - sendCompetitiveNotification()
    // - Or create a new sendRewardNotification() function

    return NextResponse.json({
      success: true,
      notificationsSent: notifications.length,
      recipients: notifications.map(n => ({
        address: n.address,
        position: n.metadata.position,
        amount: n.metadata.amount
      }))
    })

  } catch (error) {
    console.error('Error sending reward notifications:', error)
    return NextResponse.json({ 
      error: 'Failed to send notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
