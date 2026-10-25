import React, { useState, useEffect } from 'react';

interface GameResult {
  name: string;
  location: string;
  status: string;
  fr_time: string;
  sr_time: string;
  fr: string;
  sr: string;
}

interface TeerData {
  date: string;
  updated_at: string;
  games: Record<string, GameResult>;
}

export default function TeerLiveBoard({ initialData }: { initialData: TeerData }) {
  const [data, setData] = useState<TeerData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Check if today is Sunday in Indian Standard Time (Archery Holiday)
  const isSunday = typeof window !== 'undefined'
    ? new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(new Date()) === 'Sun'
    : false;

  const fetchLatest = async (isManual = false) => {
    setIsRefreshing(true);
    try {
      const url = isManual ? `/api/teer/latest?refresh=1&t=${Date.now()}` : '/api/teer/latest';
      const res = await fetch(url);
      if (res.ok) {
        const fresh: TeerData = await res.json();
        if (fresh && fresh.games) {
          setData(fresh);
          try {
            localStorage.setItem('teer_latest_live_cache', JSON.stringify(fresh));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Auto-refresh failed, retrying on next tick');
    } finally {
      setIsRefreshing(false);
      setLastCheck(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  const games = [
    { key: 'shillong', title: 'SHILLONG TEER', highlight: true },
    { key: 'khanapara', title: 'KHANAPARA TEER', highlight: false },
    { key: 'juwai', title: 'JUWAI TEER', highlight: false },
    { key: 'night', title: 'NIGHT TEER', highlight: false }
  ];

  // 1. Initial Mount: Restore from localStorage cache & trigger immediate live sync
  useEffect(() => {
    try {
      const saved = localStorage.getItem('teer_latest_live_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.games) {
          setData(parsed);
        }
      }
    } catch (e) {}

    // Immediate sync on page load so reload (F5) NEVER loses numbers
    fetchLatest(false);
  }, []);

  // 2. Intelligent Zero-Refresh Live Poller
  useEffect(() => {
    setLastCheck(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    // Check whether all results are already declared for today
    const areAllDeclared = games.every(({ key }) => {
      const g = data.games[key];
      return g && g.fr !== 'xx' && g.sr !== 'xx';
    });

    // 15 seconds during active rounds; 60 seconds if everything is declared or Sunday
    const intervalMs = areAllDeclared || isSunday ? 60000 : 15000;

    let timer: any = null;

    const startTimer = () => {
      if (!timer) {
        timer = setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            fetchLatest(false);
          }
        }, intervalMs);
      }
    };

    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchLatest(false);
        startTimer();
      } else {
        stopTimer();
      }
    };

    startTimer();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      stopTimer();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [data.games]);

  // 1-Click WhatsApp Share Generator
  const shareOnWhatsApp = (targetGameKey?: string) => {
    const formattedDate = data.date.split('-').reverse().join('/');
    let shareText = `🎯 *TEER RESULT TODAY LIVE (${formattedDate})*\n`;

    if (targetGameKey && data.games[targetGameKey]) {
      const g = data.games[targetGameKey];
      shareText += `\n🎯 *${g.name.toUpperCase()}*\n`;
      shareText += `▶ 1st Round: *${g.fr}*\n`;
      shareText += `▶ 2nd Round: *${g.sr}*\n`;
    } else {
      for (const { key, title } of games) {
        const g = data.games[key];
        if (g) {
          shareText += `\n🎯 *${title}*\n`;
          shareText += `1st: *${g.fr}* | 2nd: *${g.sr}*\n`;
        }
      }
    }

    shareText += `\n⚡ Check fastest live numbers without refresh:\n👉 https://teerresultlive.in`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

    if (typeof navigator !== 'undefined' && navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      navigator.share({
        title: 'Teer Result Live',
        text: shareText,
        url: 'https://teerresultlive.in'
      }).catch(() => {
        window.open(whatsappUrl, '_blank');
      });
    } else {
      window.open(whatsappUrl, '_blank');
    }
  };

  const copyResults = () => {
    const formattedDate = data.date.split('-').reverse().join('/');
    let text = `🎯 TEER RESULT LIVE (${formattedDate})\n`;
    for (const { key, title } of games) {
      const g = data.games[key];
      if (g) {
        text += `${title} - 1st: ${g.fr} | 2nd: ${g.sr}\n`;
      }
    }
    text += `https://teerresultlive.in`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      
      {/* Top Status & Quick Action Bar */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-600 bg-white border border-slate-200/80 rounded-xl px-3 py-2 shadow-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 font-bold flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-900 font-extrabold">
            Date: {data.date.split('-').reverse().join('/')}
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-emerald-700 text-[11px] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-black hidden sm:inline-block">
            ⚡ AUTO-SYNC ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {/* WhatsApp Direct Share Button */}
          <button
            type="button"
            onClick={() => shareOnWhatsApp()}
            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-black text-xs transition-all shadow-xs cursor-pointer active:scale-95"
            title="Share All Results on WhatsApp"
          >
            <span>💬</span>
            <span className="hidden xs:inline">WhatsApp</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchLatest(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs border border-slate-300 active:scale-95"
          >
            <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
            <span>{isRefreshing ? '...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Sunday Archery Holiday Banner */}
      {isSunday && (
        <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
          <span className="text-lg leading-none mt-0.5">🏖️</span>
          <div className="space-y-0.5">
            <p className="font-extrabold text-amber-900 text-xs sm:text-sm">
              Sunday Archery Holiday • Meghalaya Grounds Closed Today
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
              Traditional archery shooting is closed on Sundays under KHASA rules. Showing 100% verified winning numbers from the latest session. Live draws resume Monday at 1:45 PM IST.
            </p>
          </div>
        </div>
      )}

      {/* 4 Teer Game Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {games.map(({ key, title, highlight }) => {
          const game = data.games[key] || {
            name: title,
            location: '',
            status: 'UPCOMING',
            fr_time: '',
            sr_time: '',
            fr: 'xx',
            sr: 'xx'
          };

          const isDeclared = game.fr !== 'xx' && game.sr !== 'xx';
          const isFrDeclared = game.fr !== 'xx' && game.sr === 'xx';
          const isSundayOff = game.status === 'SUNDAY OFF';

          return (
            <div
              key={key}
              className={`rounded-2xl p-4 transition-all relative overflow-hidden bg-white shadow-xs ${
                highlight
                  ? 'border-2 border-amber-400 ring-4 ring-amber-500/10 shadow-sm'
                  : 'border border-slate-200/90'
              }`}
            >
              {/* Header: Title, Status & Quick Share */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>{game.name}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {game.location || 'Official Meghalaya Archery Ground'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => shareOnWhatsApp(key)}
                    className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 text-xs transition-colors cursor-pointer"
                    title={`Share ${game.name} on WhatsApp`}
                    aria-label={`Share ${game.name}`}
                  >
                    💬
                  </button>

                  <span className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                    isDeclared
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : isFrDeclared
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : isSundayOff
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}>
                    {isSundayOff ? 'SUNDAY OFF' : game.status}
                  </span>
                </div>
              </div>

              {/* 2 Rounds (FR & SR) Display */}
              <div className="grid grid-cols-2 gap-2.5 text-center">
                
                {/* First Round (FR) */}
                <div className="bg-amber-50/40 border border-amber-200/70 rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-black uppercase text-amber-800 block tracking-wider">
                    1st Round ({game.fr_time})
                  </span>
                  <span className={`text-3xl sm:text-4xl font-black font-mono block mt-1 tracking-tight ${
                    game.fr !== 'xx' ? 'text-amber-600' : 'text-slate-400'
                  }`}>
                    {game.fr}
                  </span>
                </div>

                {/* Second Round (SR) */}
                <div className="bg-emerald-50/40 border border-emerald-200/70 rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-black uppercase text-emerald-800 block tracking-wider">
                    2nd Round ({game.sr_time})
                  </span>
                  <span className={`text-3xl sm:text-4xl font-black font-mono block mt-1 tracking-tight ${
                    game.sr !== 'xx' ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {game.sr}
                  </span>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* Action Footer: Big Viral WhatsApp Share & Copy Bar */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📲</span>
          <div>
            <span className="text-xs font-black text-emerald-950 block">
              Share Live Results Instantly on WhatsApp
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">
              Forward 100% verified numbers directly to groups with one tap.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => shareOnWhatsApp()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <span>💬</span>
            <span>Share on WhatsApp</span>
          </button>
          
          <button
            type="button"
            onClick={copyResults}
            className="inline-flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            title="Copy Results Text"
          >
            {copied ? 'Copied! ✓' : '📋 Copy'}
          </button>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-500 pt-0.5">
        <span>⏱️ Last checked: {lastCheck || 'Just now'} • Updates stream automatically without refreshing page</span>
      </div>

    </div>
  );
}
