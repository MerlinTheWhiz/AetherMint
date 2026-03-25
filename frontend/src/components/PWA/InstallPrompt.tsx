/**
 * PWA Install Prompt Component
 * Handles PWA installation prompts and user interactions
 */

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  onInstall,
  onDismiss,
  className = ''
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    checkInstallStatus();
    
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);
    
    // Check if running as standalone PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone ||
                     document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      onInstall?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstall]);

  const checkInstallStatus = () => {
    // Check if PWA is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        onInstall?.();
      }
      
      setShowPrompt(false);
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during PWA installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDeferredPrompt(null);
    onDismiss?.();
  };

  const handleIOSInstall = () => {
    // Show instructions for iOS installation
    const instructions = `
      To install AetherMint on your iOS device:
      
      1. Tap the Share button at the bottom of Safari
      2. Scroll down and tap "Add to Home Screen"
      3. Tap "Add" to confirm installation
      
      This will add AetherMint to your home screen for easy access!
    `;
    
    alert(instructions);
  };

  // Don't show if already installed or standalone
  if (isInstalled || isStandalone) {
    return null;
  }

  // iOS installation instructions
  if (isIOS) {
    return (
      <div className={`fixed bottom-4 left-4 right-4 z-50 md:hidden ${className}`}>
        <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 max-w-sm mx-auto">
          <div className="flex items-start gap-3">
            <Smartphone className="w-6 h-6 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Install AetherMint</h3>
              <p className="text-sm text-blue-100 mb-3">
                Get the full experience with our app! Install AetherMint on your device for offline access and push notifications.
              </p>
              <button
                onClick={handleIOSInstall}
                className="w-full bg-white text-blue-600 font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors touch-manipulation"
              >
                Learn How to Install
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-blue-700 rounded transition-colors touch-manipulation"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop install prompt
  if (showPrompt && deferredPrompt) {
    return (
      <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Install AetherMint</h3>
              <p className="text-sm text-gray-600 mb-3">
                Install our app for the best experience! Get offline access, faster loading, and push notifications.
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <Monitor className="w-4 h-4" />
                <span>Available for desktop and mobile</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors touch-manipulation"
                >
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                >
                  Not Now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-gray-100 rounded transition-colors touch-manipulation"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Hook for PWA installation status
export const usePWAInstall = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check installation status
    const checkStatus = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone ||
                       document.referrer.includes('android-app://');
      setIsStandalone(standalone);
      setIsInstalled(standalone);
    };

    checkStatus();

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    canInstall,
    isInstalled,
    isStandalone
  };
};

// Component for install banner (shown in header)
export const InstallBanner: React.FC = () => {
  const { canInstall, isInstalled } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner
    const dismissed = localStorage.getItem('pwa-install-banner-dismissed');
    setDismissed(dismissed === 'true');
  }, []);

  if (!canInstall || isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-banner-dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            Install AetherMint for offline access and notifications
          </span>
        </div>
        <div className="flex items-center gap-2">
          <InstallPrompt />
          <button
            onClick={handleDismiss}
            className="text-blue-600 hover:text-blue-800 text-sm touch-manipulation"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
