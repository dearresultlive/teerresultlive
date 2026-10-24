import React, { useState, useEffect } from 'react';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if dismissed in current session
    if (typeof window !== 'undefined' && sessionStorage.getItem('pwa_dismissed') === 'true') {
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      (window as any).deferredPWAInstallPrompt = e;
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also detect if already running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowBanner(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa_dismissed', 'true');
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-50 px-3 sm:px-4 py-2 pointer-events-none">
      <div className="max-w-md mx-auto bg-slate-900 text-white rounded-2xl p-3 shadow-xl border border-slate-700/80 flex items-center justify-between gap-3 pointer-events-auto animate-in slide-in-from-top-4">
        
        <div className="flex items-center gap-2.5">
          <img
            src="/icon-192.png"
            alt="Teer Live App Icon"
            className="w-10 h-10 rounded-xl border border-amber-400/40 shadow-xs object-cover"
          />
          <div>
            <h4 className="text-xs font-black text-white leading-tight">
              Install Teer Live App 🎯
            </h4>
            <p className="text-[10px] text-slate-300 mt-0.5 leading-tight">
              Instant live numbers right on your home screen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 text-sm cursor-pointer rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>

      </div>
    </div>
  );
}
