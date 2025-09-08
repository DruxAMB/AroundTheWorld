'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface PinAuthProps {
  onAuthenticated: () => void;
}

export default function PinAuth({ onAuthenticated }: PinAuthProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  // Handle lock timer
  useEffect(() => {
    if (!isLocked) return;
    
    const interval = setInterval(() => {
      setLockTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked]);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and limit to 6 characters
    const newPin = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(newPin);
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) return;
    
    if (!pin || pin.length < 4) {
      setError('Please enter a valid PIN (at least 4 digits)');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Store authentication state in session storage
        sessionStorage.setItem('adminAuthenticated', 'true');
        sessionStorage.setItem('adminAuthTime', Date.now().toString());
        onAuthenticated();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        // Lock after 3 failed attempts
        if (newAttempts >= 3) {
          setIsLocked(true);
          setLockTimer(60); // 60 second lockout
          setAttempts(0);
          setError('Too many failed attempts. Please try again after the cooldown period.');
        } else {
          setError(data.error || 'Invalid PIN. Please try again.');
        }
      }
    } catch {
      setError('Failed to verify PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">🔒 Admin Authentication</h2>
      <p className="text-gray-600 mb-4">
        Please enter your administrator PIN to access this area.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
            PIN
          </label>
          <input
            type="password"
            id="pin"
            value={pin}
            onChange={handlePinChange}
            placeholder="Enter PIN"
            className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLocked || isLoading}
          />
        </div>
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 text-sm"
          >
            {error}
          </motion.div>
        )}
        
        {isLocked && (
          <div className="text-amber-600 text-sm">
            Access temporarily locked. Try again in {lockTimer} seconds.
          </div>
        )}
        
        <button
          type="submit"
          disabled={isLoading || isLocked}
          className={`w-full py-2 px-4 rounded-md font-medium text-white 
            ${isLoading || isLocked 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block mr-2"
              >
                🔄
              </motion.span>
              Verifying...
            </span>
          ) : (
            'Verify PIN'
          )}
        </button>
      </form>
    </div>
  );
}
