import React from 'react';
import { NotificationCenter } from '../components/Notifications';

const NotificationsDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              AetherMint Education Platform
            </h1>
            
            {/* Notification Center */}
            <div className="flex items-center gap-4">
              <NotificationCenter />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Notification System Demo
          </h2>
          <p className="text-gray-600 mb-8">
            Click the bell icon in the top right to see the notification center.
            The system will automatically generate demo notifications every 10 seconds.
          </p>

          {/* Demo Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-semibold">🔔</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Real-time Updates</h3>
              <p className="text-sm text-gray-600">
                Notifications appear instantly when received
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 font-semibold">📂</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Categories</h3>
              <p className="text-sm text-gray-600">
                Filter by course, message, system, or achievement notifications
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 font-semibold">⚙️</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Preferences</h3>
              <p className="text-sm text-gray-600">
                Customize notification behavior and quiet hours
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-yellow-600 font-semibold">📱</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Mobile Ready</h3>
              <p className="text-sm text-gray-600">
                Fully responsive design for all devices
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="font-semibold text-blue-900 mb-3">How to Test:</h3>
            <ul className="text-left text-sm text-blue-800 space-y-2">
              <li>• Click the bell icon to open the notification center</li>
              <li>• Wait for automatic demo notifications (every 10 seconds)</li>
              <li>• Try filtering by different categories</li>
              <li>• Mark notifications as read or remove them</li>
              <li>• Open preferences to customize notification settings</li>
              <li>• Test quiet hours functionality</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotificationsDemo;
