import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Copy, Check } from 'lucide-react';
import { COMMUNITY_LINKS } from '../config/community';
import archiveData from '../data/previous_teer_archive.json';
import { getISTCurrentMinutes } from '../utils/liveTeerFetcher';

const WhatsAppIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);


const GAME_SCHEDULE: Record<string, { frStart: number; srStart: number }> = {
  juwai: {
    frStart: 13 * 60 + 45, // 1:45 PM
    srStart: 14 * 60 + 30  // 2:30 PM
  },
  shillong: {
    frStart: 15 * 60 + 45, // 3:45 PM
    srStart: 16 * 60 + 45  // 4:45 PM
  },
  khanapara: {
    frStart: 16 * 60 + 0,  // 4:00 PM
    srStart: 16 * 60 + 30  // 4:30 PM
  },
  night: {
    frStart: 22 * 60 + 30, // 10:30 PM
    srStart: 23 * 60 + 30  // 11:30 PM
  }
};

function checkIsDrawing(gameKey: string, round: 'fr' | 'sr', value: string, nowMin: number, isToday: boolean, isSunday: boolean): boolean {
  if (!isToday || isSunday || !value || value.toLowerCase() !== 'xx') {
    return false;
  }
  const sched = GAME_SCHEDULE[gameKey];
  if (!sched) return false;

  if (gameKey === 'night') {
    if (round === 'fr') {
      return (nowMin >= sched.frStart || nowMin < 1 * 60);
    } else {
      return (nowMin >= sched.srStart || nowMin < 1 * 60 + 30);
    }
  }

  // Daytime teer games (Juwai, Shillong, Khanapara)
  if (round === 'fr') {
    return nowMin >= sched.frStart && nowMin <= 18 * 60;
  } else {
    return nowMin >= sched.srStart && nowMin <= 18 * 60 + 30;
  }
}

const ALL_GAMES_METADATA: Record<string, { title: string }> = {
  shillong: { title: 'SHILLONG TEER' },
  khanapara: { title: 'KHANAPARA TEER' },
  juwai: { title: 'JUWAI TEER' },
  night: { title: 'NIGHT TEER' }
};

function getDynamicGameOrder(nowMin: number, viewMode: 'today' | 'yesterday', isSunday: boolean): string[] {
  // If viewing yesterday or Sunday holiday, keep standard canonical order
  if (viewMode === 'yesterday' || isSunday) {
    return ['shillong', 'khanapara', 'juwai', 'night'];
  }

  // 1:15 PM to 3:15 PM: Juwai Teer Live Window (Draws at 1:45 PM & 2:30 PM)
  if (nowMin >= 13 * 60 + 15 && nowMin < 15 * 60 + 15) {
    return ['juwai', 'shillong', 'khanapara', 'night'];
  }

  // 3:15 PM to 4:00 PM: Shillong 1st Round Mega-Peak (Draws at 3:45 PM)
  if (nowMin >= 15 * 60 + 15 && nowMin < 16 * 60) {
    return ['shillong', 'khanapara', 'juwai', 'night'];
  }

  // 4:00 PM to 4:35 PM: Khanapara Active Window (Draws at 4:00 PM & 4:30 PM)
  if (nowMin >= 16 * 60 && nowMin < 16 * 60 + 35) {
    return ['khanapara', 'shillong', 'juwai', 'night'];
  }

  // 4:35 PM to 5:30 PM: Shillong 2nd Round Peak (Draws at 4:45 PM)
  if (nowMin >= 16 * 60 + 35 && nowMin < 17 * 60 + 30) {
    return ['shillong', 'khanapara', 'juwai', 'night'];
  }

  // 9:30 PM onwards to 1:00 AM (or early morning before 6:00 AM): Night Teer Window (10:30 PM & 11:30 PM)
  if (nowMin >= 21 * 60 + 30 || nowMin < 6 * 60) {
    return ['night', 'shillong', 'khanapara', 'juwai'];
  }

  // Default Daytime (Morning 6:00 AM to 1:15 PM & Evening 5:30 PM to 9:30 PM): Flagship Shillong first
  return ['shillong', 'khanapara', 'juwai', 'night'];
}

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
  yesterday?: any;
}

export default function TeerLiveBoard({ initialData }: { initialData: TeerData }) {
  const [data, setData] = useState<TeerData>(initialData);
  const yesterday = useMemo(() => {
    if (data.yesterday && data.yesterday.date !== data.date) {
      return data.yesterday;
    }
    if (archiveData && archiveData.length > 0) {
      const prior = archiveData.find((item: any) => item.date < data.date);
      return prior || archiveData[0];
    }
    return null;
  }, [data.date, data.yesterday]);
  const yesterdayFormattedDate = yesterday?.date ? yesterday.date.split('-').reverse().join('/') : '';
  const [viewMode, setViewMode] = useState<'today' | 'yesterday'>('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [currentISTMinutes, setCurrentISTMinutes] = useState<number>(() => getISTCurrentMinutes());

  // Check URL hash/params on mount for direct tab navigation (e.g., /#yesterday)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (window.location.hash === '#yesterday' || params.get('tab') === 'yesterday' || params.get('view') === 'yesterday') {
        setViewMode('yesterday');
      }
    }
  }, []);

  const displayedDate = useMemo(() => {
    if (viewMode === 'yesterday') {
      return yesterdayFormattedDate || 'Yesterday';
    }
    return data.date.split('-').reverse().join('/');
  }, [viewMode, yesterdayFormattedDate, data.date]);

  const displayedGames = useMemo<Record<string, GameResult>>(() => {
    if (viewMode === 'yesterday' && yesterday) {
      return {
        shillong: {
          name: 'Shillong Teer',
          location: 'Polo Ground, Shillong',
          fr: yesterday.shillong_fr || 'xx',
          sr: yesterday.shillong_sr || 'xx',
          fr_time: '3:45 PM',
          sr_time: '4:45 PM',
          status: (yesterday.shillong_fr && yesterday.shillong_fr !== 'xx') ? 'DECLARED' : 'UPCOMING'
        },
        khanapara: {
          name: 'Khanapara Teer',
          location: 'Them Marwet, Ri-Bhoi',
          fr: yesterday.khanapara_fr || 'xx',
          sr: yesterday.khanapara_sr || 'xx',
          fr_time: '4:00 PM',
          sr_time: '4:30 PM',
          status: (yesterday.khanapara_fr && yesterday.khanapara_fr !== 'xx') ? 'DECLARED' : 'UPCOMING'
        },
        juwai: {
          name: 'Juwai Teer',
          location: 'Ladrymbai traditional Ground',
          fr: yesterday.juwai_fr || 'xx',
          sr: yesterday.juwai_sr || 'xx',
          fr_time: '1:45 PM',
          sr_time: '2:30 PM',
          status: (yesterday.juwai_fr && yesterday.juwai_fr !== 'xx') ? 'DECLARED' : 'UPCOMING'
        },
        night: {
          name: 'Shillong Night Teer',
          location: 'Night Archery Ground',
          fr: yesterday.night_fr || 'xx',
          sr: yesterday.night_sr || 'xx',
          fr_time: '10:30 PM',
          sr_time: '11:30 PM',
          status: (yesterday.night_fr && yesterday.night_fr !== 'xx') ? 'DECLARED' : 'UPCOMING'
        }
      };
    }
    return data.games;
  }, [viewMode, yesterday, data.games]);

  // Check if today is Sunday in Indian Standard Time (Archery Holiday)
  const isSunday = (() => {
    try {
      return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(new Date()) === 'Sun';
    } catch {
      return false;
    }
  })();

  const fetchLatest = async (isManual = false) => {
    setIsRefreshing(true);
    const startTime = Date.now();
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
      if (isManual) {
        const elapsed = Date.now() - startTime;
        if (elapsed < 400) {
          await new Promise(r => setTimeout(r, 400 - elapsed));
        }
      }
      setIsRefreshing(false);
      setCurrentISTMinutes(getISTCurrentMinutes());
      setLastCheck(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  // Smart Time-Based Auto-Reordering (Active live game automatically sits at Card #1)
  const games = useMemo(() => {
    const order = getDynamicGameOrder(currentISTMinutes, viewMode, isSunday);
    return order.map((key, idx) => ({
      key,
      title: ALL_GAMES_METADATA[key]?.title || key.toUpperCase(),
      highlight: idx === 0 && viewMode === 'today'
    }));
  }, [currentISTMinutes, viewMode, isSunday]);

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
    const isYesterday = viewMode === 'yesterday';
    let shareText = '';
    if (isSunday) {
      shareText = isYesterday
        ? `🎯 *TEER RESULT (PREVIOUS ARCHIVE - ${displayedDate})*\n`
        : `🎯 *TEER RESULT (LATEST OFFICIAL - ${displayedDate})*\n`;
    } else {
      shareText = isYesterday
        ? `🎯 *TEER RESULT (YESTERDAY - ${displayedDate})*\n`
        : `🎯 *TEER RESULT TODAY LIVE (${displayedDate})*\n`;
    }

    const activeGames = displayedGames;

    if (targetGameKey && activeGames[targetGameKey]) {
      const g = activeGames[targetGameKey];
      shareText += `\n🎯 *${g.name.toUpperCase()}*\n`;
      shareText += `▶ 1st Round: *${g.fr}*\n`;
      shareText += `▶ 2nd Round: *${g.sr}*\n`;
    } else {
      for (const { key, title } of games) {
        const g = activeGames[key];
        if (g) {
          shareText += `\n🎯 *${title}*\n`;
          shareText += `1st: *${g.fr}* | 2nd: *${g.sr}*\n`;
        }
      }
    }

    shareText += `\n⚡ Check official live numbers:\n👉 https://teerresultlive.in`;

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
    const isYesterday = viewMode === 'yesterday';
    let text = '';
    if (isSunday) {
      text = isYesterday
        ? `🎯 TEER RESULT (PREVIOUS ARCHIVE - ${displayedDate})\n`
        : `🎯 TEER RESULT (LATEST OFFICIAL - ${displayedDate})\n`;
    } else {
      text = isYesterday
        ? `🎯 TEER RESULT (YESTERDAY - ${displayedDate})\n`
        : `🎯 TEER RESULT LIVE (${displayedDate})\n`;
    }
    const activeGames = displayedGames;
    for (const { key, title } of games) {
      const g = activeGames[key];
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
      
      {/* Top Status & Date Bar + Today/Yesterday Segmented Toggle (All 4 in ONE line) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between gap-1 sm:gap-2 flex-nowrap">
          
          {/* Today / Yesterday Toggle Pills */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200/80 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('today')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'today'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${viewMode === 'today' ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'}`}></span>
              <span>{isSunday ? '🎯 Latest' : 'Today'}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('yesterday')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'yesterday'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{isSunday ? 'Previous' : 'Yesterday'}</span>
            </button>
          </div>

          {/* Action Buttons: Share & Refresh */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* WhatsApp Direct Share Button */}
            <button
              type="button"
              onClick={() => shareOnWhatsApp()}
              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg font-black text-[11px] sm:text-xs transition-all shadow-xs cursor-pointer active:scale-95"
              title="Share Live Results on WhatsApp"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Share</span>
            </button>

            {/* Refresh Button (only active for today) */}
            {viewMode === 'today' && (
              <button
                type="button"
                onClick={() => fetchLatest(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1 bg-slate-900 hover:bg-black text-white px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg font-black text-[11px] sm:text-xs transition-all disabled:opacity-60 cursor-pointer shadow-xs border border-slate-800 active:scale-95"
                title="Refresh Live Results"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? 'animate-spin text-emerald-400' : 'text-slate-200'}`} />
                <span>{isRefreshing ? 'Checking...' : 'Refresh'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Date & Mode Banner */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 flex-wrap gap-2 text-slate-600">
          <div className="flex items-center gap-2 font-bold flex-wrap">
            <span className={`w-2.5 h-2.5 rounded-full ${viewMode === 'today' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
            <span className="text-slate-900 font-extrabold text-xs sm:text-sm">
              Date: {displayedDate}
            </span>
            {viewMode === 'today' ? (
              <span className={`text-[10px] px-2.5 py-0.5 rounded font-black border flex items-center gap-1.5 shadow-2xs ${
                games.some(({ key }) => {
                  const g = displayedGames[key];
                  return g && (
                    checkIsDrawing(key, 'fr', g.fr, currentISTMinutes, true, isSunday) ||
                    checkIsDrawing(key, 'sr', g.sr, currentISTMinutes, true, isSunday)
                  );
                })
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {isSunday ? (
                  '🏖️ SUNDAY HOLIDAY • LATEST OFFICIAL RESULT'
                ) : games.some(({ key }) => {
                  const g = displayedGames[key];
                  return g && (
                    checkIsDrawing(key, 'fr', g.fr, currentISTMinutes, true, isSunday) ||
                    checkIsDrawing(key, 'sr', g.sr, currentISTMinutes, true, isSunday)
                  );
                }) ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                    <span>🏹 LIVE SHOOTING & COUNTING ACTIVE</span>
                  </>
                ) : (
                  '⚡ LIVE SESSION'
                )}
              </span>
            ) : (
              <span className="text-slate-700 text-[10px] bg-slate-100 border border-slate-300 px-2 py-0.5 rounded font-black">
                {isSunday ? '🏛️ PREVIOUS DAY ARCHIVE' : '🏛️ YESTERDAY ARCHIVE'}
              </span>
            )}
          </div>

          {viewMode === 'today' && lastCheck && (
            <span className="text-[10px] text-slate-600 font-medium ml-auto">
              Checked: {lastCheck}
            </span>
          )}
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
          const game = displayedGames[key] || {
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
          const isSundayOff = game.status === 'SUNDAY OFF' && !isDeclared && !isFrDeclared;

          const isFrDrawing = checkIsDrawing(key, 'fr', game.fr, currentISTMinutes, viewMode === 'today', isSunday);
          const isSrDrawing = checkIsDrawing(key, 'sr', game.sr, currentISTMinutes, viewMode === 'today', isSunday);
          const isAnyDrawing = (isFrDrawing || isSrDrawing) && viewMode === 'today' && !isSunday;

          return (
            <div
              key={key}
              className={`rounded-2xl p-4 transition-all relative overflow-hidden bg-white shadow-xs ${
                isAnyDrawing
                  ? 'border-2 border-rose-400 ring-4 ring-rose-500/10 shadow-md'
                  : highlight && viewMode === 'today'
                  ? 'border-2 border-amber-400 ring-4 ring-amber-500/10 shadow-sm'
                  : 'border border-slate-200/90'
              }`}
            >
              {/* Header: Title, Status & Quick Share */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>{game.name}</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {game.location || 'Official Meghalaya Archery Ground'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => shareOnWhatsApp(key)}
                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer flex items-center justify-center"
                    title={`Share ${game.name} on WhatsApp`}
                    aria-label={`Share ${game.name} on WhatsApp`}
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                  </button>

                  <span className={`text-[9px] sm:text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border whitespace-nowrap ${
                    isDeclared
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : isAnyDrawing
                      ? 'bg-rose-50 text-rose-700 border-rose-300 flex items-center gap-1 shadow-2xs'
                      : isFrDeclared
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : isSundayOff
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}>
                    {isDeclared ? (
                      isSunday ? 'OFFICIAL RESULT' : 'DECLARED'
                    ) : isAnyDrawing ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                        <span>LIVE DRAW</span>
                      </>
                    ) : isFrDeclared ? (
                      '1ST ROUND OUT'
                    ) : isSundayOff ? (
                      'SUNDAY OFF'
                    ) : (
                      game.status
                    )}
                  </span>
                </div>
              </div>

              {/* 2 Rounds (FR & SR) Display */}
              <div className="grid grid-cols-2 gap-2 text-center">
                
                {/* First Round (FR) */}
                <div className={`rounded-xl p-2.5 sm:p-3 shadow-2xs transition-all relative overflow-hidden flex flex-col justify-between ${
                  isFrDrawing
                    ? 'bg-gradient-to-b from-amber-50/90 to-amber-100/60 border-2 border-amber-400 ring-2 ring-amber-400/20'
                    : 'bg-amber-50/40 border border-amber-200/70'
                }`}>
                  <div className="flex items-center justify-center gap-1 text-center">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase text-amber-900 tracking-wider truncate">
                      1st ({game.fr_time})
                    </span>
                    {isFrDrawing && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" title="Live Draw Active"></span>
                    )}
                  </div>

                  {isFrDrawing ? (
                    <div className="my-1 flex flex-col items-center justify-center">
                      <div className="flex items-center justify-center gap-1 py-0.5">
                        <span className="relative flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl inline-block transform -rotate-45 animate-pulse select-none" aria-hidden="true">
                            🏹
                          </span>
                          <span className="absolute -inset-1 rounded-full bg-amber-400/20 animate-ping opacity-60"></span>
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-300/80 px-2 py-0.5 rounded-full mt-0.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        <span className="text-[9px] sm:text-[10px] font-black text-amber-900 uppercase tracking-tight whitespace-nowrap">
                          Counting Arrows
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className={`text-3xl sm:text-4xl font-black font-mono block mt-1 tracking-tight ${
                      game.fr !== 'xx' ? 'text-amber-600' : 'text-slate-400'
                    }`}>
                      {game.fr}
                    </span>
                  )}
                </div>

                {/* Second Round (SR) */}
                <div className={`rounded-xl p-2.5 sm:p-3 shadow-2xs transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSrDrawing
                    ? 'bg-gradient-to-b from-emerald-50/90 to-emerald-100/60 border-2 border-emerald-400 ring-2 ring-emerald-400/20'
                    : 'bg-emerald-50/40 border border-emerald-200/70'
                }`}>
                  <div className="flex items-center justify-center gap-1 text-center">
                    <span className="text-[10px] sm:text-[11px] font-black uppercase text-emerald-900 tracking-wider truncate">
                      2nd ({game.sr_time})
                    </span>
                    {isSrDrawing && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" title="Live Draw Active"></span>
                    )}
                  </div>

                  {isSrDrawing ? (
                    <div className="my-1 flex flex-col items-center justify-center">
                      <div className="flex items-center justify-center gap-1 py-0.5">
                        <span className="relative flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl inline-block transform -rotate-45 animate-pulse select-none" aria-hidden="true">
                            🏹
                          </span>
                          <span className="absolute -inset-1 rounded-full bg-emerald-400/20 animate-ping opacity-60"></span>
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-300/80 px-2 py-0.5 rounded-full mt-0.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        <span className="text-[9px] sm:text-[10px] font-black text-emerald-900 uppercase tracking-tight whitespace-nowrap">
                          Counting Arrows
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className={`text-3xl sm:text-4xl font-black font-mono block mt-1 tracking-tight ${
                      game.sr !== 'xx' ? 'text-emerald-600' : 'text-slate-400'
                    }`}>
                      {game.sr}
                    </span>
                  )}
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* Official Community Channel (Telegram Only) */}
      <div className="bg-gradient-to-r from-sky-50 via-indigo-50/30 to-sky-100/50 border border-sky-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#229ED9] text-white flex items-center justify-center text-xl shadow-xs shrink-0">
              ✈️
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Join Official Telegram Alerts Channel</span>
                <span className="bg-[#229ED9] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  INSTANT
                </span>
              </h3>
              <p className="text-[11px] text-slate-600 font-medium">
                Instant 0-second live result notifications &amp; daily target formulas direct to your phone.
              </p>
            </div>
          </div>
        </div>

        <div>
          {/* Telegram Channel Button */}
          <a
            href={COMMUNITY_LINKS.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-[#229ED9] to-[#0088cc] hover:from-[#1b8bc2] hover:to-[#0077b3] text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">✈️</span>
              <div className="text-left">
                <span className="block font-black text-xs sm:text-sm leading-tight">Join Official Telegram Channel</span>
                <span className="block text-[10px] sm:text-[11px] text-sky-100 font-medium leading-tight mt-0.5">0-Sec Fast Declared Results &amp; Target Formulas</span>
              </div>
            </div>
            <span className="text-white text-base font-black pl-2 group-hover:translate-x-1 transition-transform">➔</span>
          </a>
        </div>
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
            <WhatsAppIcon className="w-4 h-4" />
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
