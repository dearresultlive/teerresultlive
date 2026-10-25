import React, { useState, useEffect } from 'react';

const DISMISS_COOLDOWN_DAYS = 7;
const DISMISS_COOLDOWN_MS = DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'teer_pwa_dismissed_until';
const INSTALLED_KEY = 'teer_pwa_installed';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Never show if user already installed the app
    if (
      localStorage.getItem(INSTALLED_KEY) === 'true' ||
      window.matchMedia('(display-mode: standalone)').matches
    ) {
      setShowBanner(false);
      return;
    }

    // 2. 7-Day Cooldown Check: If cancelled/dismissed, hide for 7 days
    const dismissedUntil = localStorage.getItem(STORAGE_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      (window as any).deferredPWAInstallPrompt = e;
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If deferred prompt was already captured before mount
    if ((window as any).deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
      setShowBanner(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert('To install, tap your browser menu (⋮ or Share) and select "Add to Home screen" or "Install App".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem(INSTALLED_KEY, 'true');
      }
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    if (typeof window !== 'undefined') {
      // Set 7-day expiration timestamp
      const expireTime = Date.now() + DISMISS_COOLDOWN_MS;
      localStorage.setItem(STORAGE_KEY, String(expireTime));
    }
  };

  if (!showBanner) return null;

  return (
    <div className="w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-300">
      
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <img
          src="/icon-192.png"
          alt="Teer Live App Icon"
          className="w-11 h-11 rounded-xl border border-amber-400/40 shadow-xs object-cover shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
              Install Teer Live App 🎯
            </h4>
            <span className="bg-amber-500/20 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-400/30 uppercase tracking-wide">
              Official PWA
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
            Instant 0-second live numbers &amp; daily target tips right on your phone.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
        <button
          type="button"
          onClick={handleInstall}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
        >
          <span>📲</span>
          <span>Install Free</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white px-2 py-1.5 text-xs font-bold cursor-pointer rounded-xl hover:bg-slate-800/80 transition-colors"
          aria-label="Dismiss banner for 7 days"
          title="Dismiss for 7 days"
        >
          ✕
        </button>
      </div>

    </div>
  );
}
