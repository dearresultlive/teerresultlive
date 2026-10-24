import React, { useState, useEffect } from 'react';

interface Props {
  currentPath?: string;
}

export default function MobileBottomNav({ currentPath = '/' }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const cleanPath = currentPath === '/' ? '/' : currentPath.replace(/\/+$/, '');

  // Detect PWA install availability
  useEffect(() => {
    const checkPWA = () => {
      if (typeof window !== 'undefined' && (window as any).deferredPWAInstallPrompt) {
        setCanInstall(true);
      }
    };
    checkPWA();

    const handler = () => {
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Handle native PWA install prompt
  const handleInstallApp = async () => {
    const prompt = (window as any).deferredPWAInstallPrompt;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        (window as any).deferredPWAInstallPrompt = null;
        setCanInstall(false);
        setDrawerOpen(false);
      }
    } else {
      alert('To install Teer Live App:\n\n• Android Chrome: Tap ⋮ menu > "Add to Home screen" or "Install App".\n• iPhone Safari: Tap Share (📤) > "Add to Home Screen".');
    }
  };

  const isLiveActive = cleanPath === '/';
  const isArchiveActive = cleanPath === '/previous-results';

  return (
    <>
      {/* ============================================================== */}
      {/* 1. Mobile Fixed Bottom Navigation Bar (DearResultLive Style) */}
      {/* ============================================================== */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/98 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] pb-[max(0.4rem,env(safe-area-inset-bottom))] transition-all"
      >
        <div className="grid grid-cols-5 h-15 max-w-lg mx-auto px-1 items-center">
          
          {/* Tab 1: Today / Live */}
          <a
            href="/"
            className={`flex flex-col items-center justify-center gap-0.5 relative py-1 rounded-xl transition-all ${
              isLiveActive ? 'text-blue-600 font-black' : 'text-slate-600 font-semibold hover:text-slate-900'
            }`}
          >
            {isLiveActive && (
              <span className="absolute top-0 w-8 h-0.5 rounded-full bg-blue-600 shadow-xs"></span>
            )}
            <div className={`w-6 h-6 flex items-center justify-center transition-transform ${isLiveActive ? 'scale-110' : ''}`}>
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <defs>
                  <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FDE047" />
                    <stop offset="60%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#D97706" />
                  </radialGradient>
                  <filter id="sunGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#F59E0B" floodOpacity="0.4"/>
                  </filter>
                </defs>
                <circle cx="16" cy="16" r="10" fill="url(#sunGrad)" filter="url(#sunGlow)"/>
                <circle cx="16" cy="16" r="13" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.8"/>
                <circle cx="16" cy="16" r="3.5" fill="#FFFFFF" opacity="0.95"/>
              </svg>
            </div>
            <span className="text-[10px] tracking-tight leading-none">
              Today
            </span>
          </a>

          {/* Tab 2: Targets */}
          <a
            href="/#common-numbers"
            className="flex flex-col items-center justify-center gap-0.5 relative py-1 rounded-xl transition-all text-slate-600 font-semibold hover:text-slate-900"
          >
            <div className="w-6 h-6 flex items-center justify-center transition-transform">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <defs>
                  <linearGradient id="ticketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F43F5E" />
                    <stop offset="100%" stopColor="#E11D48" />
                  </linearGradient>
                  <filter id="ticketShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#E11D48" floodOpacity="0.35"/>
                  </filter>
                </defs>
                <rect x="4" y="8" width="24" height="16" rx="4" fill="url(#ticketGrad)" filter="url(#ticketShadow)"/>
                <circle cx="4" cy="16" r="3" fill="#FFFFFF"/>
                <circle cx="28" cy="16" r="3" fill="#FFFFFF"/>
                <line x1="12" y1="11" x2="12" y2="21" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.85"/>
                <circle cx="20" cy="16" r="3" stroke="#FFFFFF" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            <span className="text-[10px] tracking-tight leading-none">
              Targets
            </span>
          </a>

          {/* Tab 3: Formula (Interactive Target Engine) */}
          <a
            href="/#formula-calculator"
            className="flex flex-col items-center justify-center gap-0.5 relative py-1 rounded-xl transition-all text-slate-600 font-semibold hover:text-slate-900"
          >
            <div className="w-6 h-6 flex items-center justify-center transition-transform">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <defs>
                  <linearGradient id="targetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#A855F7" />
                  </linearGradient>
                  <filter id="targetShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#A855F7" floodOpacity="0.35"/>
                  </filter>
                </defs>
                <circle cx="16" cy="16" r="11" fill="url(#targetGrad)" filter="url(#targetShadow)"/>
                <circle cx="16" cy="16" r="7.5" fill="#FFFFFF"/>
                <circle cx="16" cy="16" r="4.5" fill="#EC4899"/>
                <circle cx="16" cy="16" r="2" fill="#FFFFFF"/>
                <path d="M21 11 L26 6 M23 8 L25 10" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-[10px] tracking-tight leading-none">
              Formula
            </span>
          </a>

          {/* Tab 4: Archive (Hit Search & Checker) */}
          <a
            href="/previous-results"
            className={`flex flex-col items-center justify-center gap-0.5 relative py-1 rounded-xl transition-all ${
              isArchiveActive ? 'text-blue-600 font-black' : 'text-slate-600 font-semibold hover:text-slate-900'
            }`}
          >
            {isArchiveActive && (
              <span className="absolute top-0 w-8 h-0.5 rounded-full bg-blue-600 shadow-xs"></span>
            )}
            <div className={`w-6 h-6 flex items-center justify-center transition-transform ${isArchiveActive ? 'scale-110' : ''}`}>
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <defs>
                  <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#0284C7" />
                  </linearGradient>
                  <filter id="glassShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#0284C7" floodOpacity="0.35"/>
                  </filter>
                </defs>
                <circle cx="14" cy="14" r="8" fill="url(#lensGrad)" filter="url(#glassShadow)"/>
                <circle cx="14" cy="14" r="5.5" stroke="#BAE6FD" strokeWidth="1.5" fill="none" opacity="0.85"/>
                <path d="M11 11 A3 3 0 0 1 15 9" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
                <rect x="20" y="19" width="4" height="9" rx="2" transform="rotate(-45 20 19)" fill="#7C3AED"/>
              </svg>
            </div>
            <span className="text-[10px] tracking-tight leading-none">
              Archive
            </span>
          </a>

          {/* Tab 5: More (Hamburger Menu Button) */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open Features Menu"
            className={`flex flex-col items-center justify-center gap-0.5 relative py-1 rounded-xl transition-all cursor-pointer ${
              drawerOpen ? 'text-blue-600 font-black' : 'text-slate-600 font-semibold hover:text-slate-900'
            }`}
          >
            {drawerOpen && (
              <span className="absolute top-0 w-8 h-0.5 rounded-full bg-blue-600 shadow-xs"></span>
            )}
            <div className="w-6 h-6 flex items-center justify-center transition-transform">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
                <line x1="4" y1="18" x2="20" y2="18"/>
              </svg>
            </div>
            <span className="text-[10px] tracking-tight leading-none">
              More
            </span>
          </button>

        </div>
      </nav>

      {/* ============================================================== */}
      {/* 2. Slide-Up Menu & Features Bottom Sheet (DearResultLive Style) */}
      {/* ============================================================== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          
          {/* Backdrop overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            aria-hidden="true"
          />

          {/* Bottom Sheet Modal Container */}
          <div className="relative bg-white rounded-t-3xl shadow-2xl p-4 sm:p-5 max-w-lg w-full mx-auto pb-8 z-10 animate-in slide-in-from-bottom duration-300 border-t border-slate-100 max-h-[85vh] overflow-y-auto">
            
            {/* Gray Top Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3"></div>

            {/* Header: Title + Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Menu &amp; Features
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* Feature Cards Stack */}
            <div className="space-y-2.5">
              
              {/* Card 1: 5Y Hit Archive & Digit Frequency */}
              <a
                href="/previous-results"
                onClick={() => setDrawerOpen(false)}
                className="group flex items-center justify-between p-3 rounded-2xl border border-blue-100 bg-blue-50/40 hover:bg-blue-50 transition-all shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
                    📊
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 text-xs sm:text-sm">
                        5Y Hit Analytics &amp; Archive
                      </span>
                      <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        HOT
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                      Search 2-digit numbers, frequency &amp; past hit patterns
                    </p>
                  </div>
                </div>
                <span className="text-blue-600 font-black text-base pl-2 group-hover:translate-x-0.5 transition-transform">
                  ➔
                </span>
              </a>

              {/* Card 2: Teer Target & Formula Engine */}
              <a
                href="/#formula-calculator"
                onClick={() => setDrawerOpen(false)}
                className="group flex items-center justify-between p-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 hover:bg-amber-50 transition-all shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
                    🧮
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 text-xs sm:text-sm">
                        Formula &amp; Target Engine
                      </span>
                      <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        NEW
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                      Calculate today's House, Ending &amp; Cut numbers
                    </p>
                  </div>
                </div>
                <span className="text-amber-600 font-black text-base pl-2 group-hover:translate-x-0.5 transition-transform">
                  ➔
                </span>
              </a>

              {/* Card 3: Teer Prize & Winnings Calculator */}
              <a
                href="/#prize-calculator"
                onClick={() => setDrawerOpen(false)}
                className="group flex items-center justify-between p-3 rounded-2xl border border-purple-100 bg-purple-50/40 hover:bg-purple-50 transition-all shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
                    🏆
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 text-xs sm:text-sm">
                        Prize &amp; Payout Calculator
                      </span>
                      <span className="bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        80X
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                      Official FR, SR &amp; Forecast winning rates calculator
                    </p>
                  </div>
                </div>
                <span className="text-purple-600 font-black text-base pl-2 group-hover:translate-x-0.5 transition-transform">
                  ➔
                </span>
              </a>

              {/* Card 4: Khasi Dream Number Directory */}
              <a
                href="/dream-numbers"
                onClick={() => setDrawerOpen(false)}
                className="group flex items-center justify-between p-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 transition-all shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
                    🌙
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 text-xs sm:text-sm">
                        Khasi Dream Directory
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                      Traditional dream symbols &amp; A-Z target lookup
                    </p>
                  </div>
                </div>
                <span className="text-emerald-600 font-black text-base pl-2 group-hover:translate-x-0.5 transition-transform">
                  ➔
                </span>
              </a>

              {/* Card 4: Install Mobile App (PWA) Card */}
              <div
                onClick={handleInstallApp}
                className="group flex items-center justify-between p-3 rounded-2xl border-2 border-amber-300 bg-amber-50/80 hover:bg-amber-100/80 transition-all shadow-2xs cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
                    📲
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 text-xs sm:text-sm">
                        Install Mobile App
                      </span>
                      <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        {canInstall ? '1-TAP' : 'FAST'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium line-clamp-1 mt-0.5">
                      Ad-free, 1-tap instant zero-refresh results on home screen
                    </p>
                  </div>
                </div>
                <span className="text-amber-700 font-black text-base pl-2 group-hover:translate-x-0.5 transition-transform">
                  ➔
                </span>
              </div>

            </div>

            {/* Bottom Footer Links Row */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-center gap-3 text-xs text-slate-500 font-semibold flex-wrap">
              <a href="/disclaimer" onClick={() => setDrawerOpen(false)} className="hover:text-slate-900 transition-colors">
                Disclaimer
              </a>
              <span>•</span>
              <a href="/terms" onClick={() => setDrawerOpen(false)} className="hover:text-slate-900 transition-colors">
                Terms
              </a>
              <span>•</span>
              <a href="/privacy-policy" onClick={() => setDrawerOpen(false)} className="hover:text-slate-900 transition-colors">
                Privacy
              </a>
              <span>•</span>
              <a href="/about" onClick={() => setDrawerOpen(false)} className="hover:text-slate-900 transition-colors">
                About
              </a>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
