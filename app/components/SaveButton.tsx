"use client";

import { useAddFrame } from '@coinbase/onchainkit/minikit';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useState } from 'react';

export default function SaveButton() {
  const addFrame = useAddFrame();
  const { context } = useMiniKit();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddFrame = async () => {
    setIsAdding(true);
    try {
      const result = await addFrame();
      if (result) {
        console.log('Frame saved:', result.url);
        console.log('Notification token:', result.token);
        
        // Save to your database for future notifications
        await saveNotificationToken(
          result.token, 
          result.url, 
          context?.user?.fid,
          result.notificationDetails
        );
        
        alert('Mini App saved successfully! 🎉');
      } else {
        console.log('User cancelled or frame already saved');
      }
    } catch (error) {
      console.error('Failed to save frame:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <button 
      onClick={handleAddFrame}
      disabled={isAdding}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
    >
      {isAdding ? 'Saving...' : 'Save Mini App'}
    </button>
  );
}

async function saveNotificationToken(
  token: string, 
  url: string, 
  fid?: number,
  notificationDetails?: any
) {
  try {
    const response = await fetch('/api/notification-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token, 
        url, 
        fid,
        notificationDetails 
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save notification token');
    }
    
    console.log('Notification token saved successfully');
  } catch (error) {
    console.error('Error saving notification token:', error);
  }
}
