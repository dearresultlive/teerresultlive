import React, { useState, useEffect } from 'react';

const DISMISS_COOLDOWN_DAYS = 5;
const DISMISS_COOLDOWN_MS = DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'teer_pwa_floating_dismissed_until';
const INSTALLED_KEY = 'teer_pwa_installed';
const SHOW_DELAY_MS = 3500; // Delay in ms before floating banner appears

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
      return;
    }

    // 2. 5-Day Cooldown Check: If user crossed/dismissed it, hide for 5 days
    const dismissedUntil = localStorage.getItem(STORAGE_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    // 3. Capture beforeinstallprompt event
    const handler = (e: any) => {
      e.preventDefault();
      (window as any).deferredPWAInstallPrompt = e;
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if ((window as any).deferredPWAInstallPrompt) {
      setDeferredPrompt((window as any).deferredPWAInstallPrompt);
    }

    // 4. Show floating banner after a few seconds delay
    const timer = setTimeout(() => {
      // Re-verify conditions before showing
      const stillDismissed = localStorage.getItem(STORAGE_KEY);
      const isInstalled =
        localStorage.getItem(INSTALLED_KEY) === 'true' ||
        window.matchMedia('(display-mode: standalone)').matches;

      if (!isInstalled && (!stillDismissed || Date.now() >= Number(stillDismissed))) {
        setShowBanner(true);
      }
    }, SHOW_DELAY_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPrompt || (typeof window !== 'undefined' && (window as any).deferredPWAInstallPrompt);
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem(INSTALLED_KEY, 'true');
          (window as any).deferredPWAInstallPrompt = null;
        }
      }
    } else {
      alert(
        'To install Teer Result Live App on your screen:\n\n' +
        '• Android (Chrome): Tap the 3 dots (⋮) at top-right > select "Add to Home screen" or "Install App".\n' +
        '• iPhone (Safari): Tap the Share button (📤) at bottom > select "Add to Home Screen".'
      );
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    if (typeof window !== 'undefined') {
      // 5-Day Cooldown
      const expireTime = Date.now() + DISMISS_COOLDOWN_MS;
      localStorage.setItem(STORAGE_KEY, String(expireTime));
    }
  };

  if (!showBanner) return null;

  return (
    <aside
      aria-label="Install Teer Result Live App"
      className="fixed bottom-[4.25rem] md:bottom-5 left-3 right-3 sm:left-6 sm:right-6 max-w-md md:ml-auto md:mr-6 z-40 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="bg-white/98 backdrop-blur-md rounded-2xl sm:rounded-3xl border-2 border-amber-400 p-2.5 sm:p-3 shadow-[0_12px_36px_rgba(15,23,42,0.18)] flex items-center justify-between gap-2.5">
        
        {/* Left: App Icon with Red Notification Dot + Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          
          {/* App Squircle with Red Notification Dot */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-xl shadow-xs border border-amber-300 overflow-hidden">
              <span className="text-2xl select-none leading-none">🎯</span>
            </div>
            {/* Red Notification Badge Dot */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white"></span>
            </span>
          </div>

          {/* Title + Subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-black text-slate-900 text-xs sm:text-sm tracking-tight truncate">
                Teer Result Live App
              </span>
              <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                FAST
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              1-tap instant draws on screen
            </p>
          </div>
        </div>

        {/* Right: Install Button + Dismiss Cross */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Install Button */}
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 active:scale-95 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-xs transition-transform cursor-pointer"
            aria-label="Install App"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Install</span>
          </button>

          {/* Cross Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-500 hover:text-slate-800 flex items-center justify-center shrink-0 transition-all cursor-pointer"
            aria-label="Close"
            title="Dismiss for 5 days"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

        </div>

      </div>
    </aside>
  );
}
