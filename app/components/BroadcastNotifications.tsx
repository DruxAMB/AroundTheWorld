'use client';

import { useState } from 'react';

interface BroadcastResult {
  success: boolean;
  totalPlayers?: number;
  successCount?: number;
  failureCount?: number;
  message: string;
}

export default function BroadcastNotifications() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [formData, setFormData] = useState({
    amount: '30',
    symbol: 'USD',
    contributor: 'ENB'
  });

  const [customData, setCustomData] = useState({
    title: '🎮 Game Update!',
    message: 'The game is now easier than ever, more moves has been added, less special candies required!'
  });

  const sendRewardPoolUpdate = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'reward_pool_update',
          amount: formData.amount,
          symbol: formData.symbol,
          contributor: formData.contributor,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendCustomNotification = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'general',
          title: customData.title,
          body: customData.message,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendGeneralAnnouncement = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'general',
          title: '🎮 Game Update!',
          body: 'New features and improvements are now live! Check them out!',
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">📢 Broadcast Notifications</h2>
      
      {/* Reward Pool Update Section */}
      <div className="mb-8 p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">💰 Reward Pool Update</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-black">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Amount</label>
            <input
              type="text"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="30"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="USD"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Contributor</label>
            <input
              type="text"
              value={formData.contributor}
              onChange={(e) => setFormData({ ...formData, contributor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ENB"
            />
          </div>
        </div>
        
        <button
          onClick={sendRewardPoolUpdate}
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
        >
          {isLoading ? '📤 Sending...' : '💰 Send Reward Pool Update'}
        </button>
      </div>

      {/* Custom Text Notification Section */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">📝 Custom Text Notification</h3>
        
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={customData.title}
              onChange={(e) => setCustomData({ ...customData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="🎮 Game Update!"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Message</label>
            <textarea
              value={customData.message}
              onChange={(e) => setCustomData({ ...customData, message: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black resize-none"
              placeholder="The game is now easier than ever, more moves has been added, less special candies required!"
            />
          </div>
        </div>
        
        <button
          onClick={sendCustomNotification}
          disabled={isLoading || !customData.title.trim() || !customData.message.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
        >
          {isLoading ? '📤 Sending...' : '📝 Send Custom Notification'}
        </button>
      </div>

      {/* General Announcement Section */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">🎮 Quick Game Update</h3>
        
        <button
          onClick={sendGeneralAnnouncement}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
        >
          {isLoading ? '📤 Sending...' : '🎮 Send Default Game Update'}
        </button>
      </div>

      {/* Results Section */}
      {result && (
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center mb-2">
            <span className="text-lg mr-2">{result.success ? '✅' : '❌'}</span>
            <h4 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? 'Broadcast Successful!' : 'Broadcast Failed'}
            </h4>
          </div>
          
          <p className={`mb-2 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
            {result.message}
          </p>
          
          {result.success && result.totalPlayers && (
            <div className="text-sm text-green-600">
              <p>📊 <strong>Total Players:</strong> {result.totalPlayers}</p>
              <p>✅ <strong>Successful:</strong> {result.successCount}</p>
              <p>❌ <strong>Failed:</strong> {result.failureCount}</p>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <p>💡 <strong>Tip:</strong> Notifications are sent to all players with Farcaster accounts who have granted notification permissions.</p>
      </div>
    </div>
  );
}
