"use client";

import { useAddFrame } from '@coinbase/onchainkit/minikit';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartSaveButtonProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SmartSaveButton({ isOpen, onClose }: SmartSaveButtonProps) {
  const addFrame = useAddFrame();
  const { context } = useMiniKit();
  const [isAdding, setIsAdding] = useState(false);

  // Don't show modal if already saved
  if (context?.client?.added) {
    return null;
  }

  const handleAddFrame = async () => {
    setIsAdding(true);
    try {
      const result = await addFrame();
      if (result) {
        // console.log('Frame saved:', result.url);
        // console.log('Notification token:', result.token);
        
        // Save to your database for future notifications
        await saveNotificationToken(
          result.token, 
          result.url, 
          context?.user?.fid
        );
        
        alert('Mini App saved successfully! 🎉');
        onClose();
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          
          {/* Slide-up overlay */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed backdrop-blur-lg bottom-0 left-0 right-0 z-50 bg-[var(--app-card-bg)] border-t border-[var(--app-card-border)] rounded-t-2xl shadow-2xl"
          >
            <div className="w-full max-w-md mx-auto p-6">
              {/* Handle bar */}
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
              
              {/* Content */}
              <div className="text-center space-y-4">
                <div className="text-4xl mb-2">🟦</div>
                <h2 className="text-xl font-bold text-[var(--app-foreground)]">
                  Save App
                </h2>
                <p className="text-[var(--app-foreground-muted)] text-sm">
                  Add AroundTheWorld to your home screen for quick access. Are you on the baseapp? Click on the three dot <b className='font-bold text-6xl'>...</b> on your top left to save
                </p>
                
                <div className="flex gap-2 pt-4">
                  <button 
                    onClick={handleAddFrame}
                    disabled={isAdding}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors"
                  >
                    {isAdding ? 'Saving...' : 'Save'}
                  </button>
                  
                  <button 
                    onClick={onClose}
                    className="w-full px-6 py-3 bg-[var(--app-gray)] hover:bg-gray-800 text-[var(--app-foreground)] rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

async function saveNotificationToken(
  token: string, 
  url: string, 
  fid?: number
) {
  try {
    const response = await fetch('/api/notification-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token, 
        url, 
        fid
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save notification token');
    }
    
    // console.log('Notification token saved successfully');
  } catch (error) {
    console.error('Error saving notification token:', error);
  }
}
