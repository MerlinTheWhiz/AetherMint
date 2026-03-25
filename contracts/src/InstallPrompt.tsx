import React, { useEffect, useState } from 'react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI to notify the user they can add to home screen
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg flex justify-between items-center">
      <span className="font-medium">Install AetherMint for a better experience!</span>
      <button 
        onClick={handleInstallClick}
        className="bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-bold hover:bg-gray-100 transition-colors"
      >
        Install
      </button>
      <button 
        onClick={() => setShowPrompt(false)}
        className="ml-2 text-white hover:text-gray-200"
      >
        ✕
      </button>
    </div>
  );
};

export default InstallPrompt;