'use client';

import BroadcastNotifications from '@/app/components/BroadcastNotifications';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🎮 AroundTheWorld Admin</h1>
          <p className="text-gray-600">Manage game notifications and announcements</p>
        </div>
        
        <BroadcastNotifications />
      </div>
    </div>
  );
}
