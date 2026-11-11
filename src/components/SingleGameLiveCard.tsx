import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import archiveData from '../data/previous_teer_archive.json';
import type { TeerData, GameResult } from '../utils/teerShared';
import {
  checkIsDrawing,
  getISTCurrentMinutes,
  isSundayInIST,
  ALL_GAMES_METADATA,
  WhatsAppIcon
} from '../utils/teerShared';

interface SingleGameLiveCardProps {
  gameKey: 'shillong' | 'khanapara' | 'juwai' | 'night';
  initialData: TeerData;
  themeColor?: 'amber' | 'emerald' | 'blue' | 'indigo';
}

export default function SingleGameLiveCard({
  gameKey,
  initialData,
  themeColor = 'emerald'
}: SingleGameLiveCardProps) {
  const [data, setData] = useState<TeerData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>('');
  const [currentISTMinutes, setCurrentISTMinutes] = useState<number>(() => getISTCurrentMinutes());
  const [revisionNotice, setRevisionNotice] = useState<string | null>(null);

  // Auto-dismiss revision notice after 12 seconds
  useEffect(() => {
    if (revisionNotice) {
      const timer = setTimeout(() => setRevisionNotice(null), 12000);
      return () => clearTimeout(timer);
    }
  }, [revisionNotice]);

  const isSunday = isSundayInIST();

  // Find yesterday's record
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
  const todayFormattedDate = data.date ? data.date.split('-').reverse().join('/') : '';

  // Default to 'today' so Googlebot and visitors always see Today Live with 100% SEO Title/H1 alignment
  const [viewMode, setViewMode] = useState<'today' | 'yesterday'>('today');

  // Check URL hash/params on mount for direct tab navigation (e.g. /#yesterday)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (window.location.hash === '#yesterday' || params.get('tab') === 'yesterday' || params.get('view') === 'yesterday') {
        setViewMode('yesterday');
      } else if (window.location.hash === '#today' || params.get('tab') === 'today' || params.get('view') === 'today') {
        setViewMode('today');
      }
    }
  }, []);

  // Ensure H1 Label & Date strictly remain "Today Live" for 100% SEO Title/H1 alignment (never overwritten to Yesterday)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const liveLabel = document.getElementById('game-live-label');
      const dateLabel = document.getElementById('game-date-label');
      if (liveLabel) {
        liveLabel.textContent = isSunday ? 'Latest' : 'Today Live';
      }
      if (dateLabel) {
        dateLabel.textContent = todayFormattedDate;
      }
    }
  }, [todayFormattedDate, isSunday]);

  const meta = ALL_GAMES_METADATA[gameKey] || {
    title: gameKey.toUpperCase(),
    defaultFrTime: '1st Round',
    defaultSrTime: '2nd Round',
    location: 'Official Archery Ground'
  };

  const game = useMemo<GameResult>(() => {
    if (viewMode === 'yesterday' && yesterday) {
      const frVal = yesterday[`${gameKey}_fr`] || 'xx';
      const srVal = yesterday[`${gameKey}_sr`] || 'xx';
      return {
        name: meta.title,
        location: meta.location,
        fr: frVal,
        sr: srVal,
        fr_time: meta.defaultFrTime,
        sr_time: meta.defaultSrTime,
        status: frVal !== 'xx' ? 'DECLARED' : 'UPCOMING',
        fr_verification: frVal !== 'xx' ? 'VERIFIED' : 'UNVERIFIED',
        sr_verification: srVal !== 'xx' ? 'VERIFIED' : 'UNVERIFIED'
      };
    }
    return data.games[gameKey] || {
      name: meta.title,
      location: meta.location,
      status: 'UPCOMING',
      fr_time: meta.defaultFrTime,
      sr_time: meta.defaultSrTime,
      fr: 'xx',
      sr: 'xx',
      fr_verification: 'UNVERIFIED',
      sr_verification: 'UNVERIFIED'
    };
  }, [viewMode, yesterday, data.games, gameKey, meta]);

  const isDeclared = game.fr !== 'xx' && game.sr !== 'xx';
  const isFrDeclared = game.fr !== 'xx' && game.sr === 'xx';
  const isSundayOff = isSunday && !isDeclared && !isFrDeclared;

  const isFrDrawing = checkIsDrawing(gameKey, 'fr', game.fr, currentISTMinutes, viewMode === 'today', isSunday);
  const isSrDrawing = checkIsDrawing(gameKey, 'sr', game.sr, currentISTMinutes, viewMode === 'today', isSunday);
  const isAnyDrawing = (isFrDrawing || isSrDrawing) && viewMode === 'today' && !isSunday;

  const yestFr = yesterday ? (yesterday as any)[`${gameKey}_fr`] : null;
  const yestSr = yesterday ? (yesterday as any)[`${gameKey}_sr`] : null;

  // Real-time zero-refresh polling fetcher
  const fetchLatest = async (isManual = false) => {
    setIsRefreshing(true);
    const startTime = Date.now();
    try {
      const url = `/api/teer/latest?refresh=${isManual ? '1' : '0'}&_t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const fresh: TeerData = await res.json();
        if (fresh && fresh.games) {
          setData((prev) => {
            const oldG = prev?.games?.[gameKey];
            const newG = fresh?.games?.[gameKey];
            if (oldG && newG) {
              const gameTitle = meta.title;
              if (oldG.fr !== 'xx' && newG.fr !== 'xx' && oldG.fr !== newG.fr) {
                setRevisionNotice(`Official Update: ${gameTitle} 1st Round revised from ${oldG.fr} to ${newG.fr}`);
              } else if (oldG.sr !== 'xx' && newG.sr !== 'xx' && oldG.sr !== newG.sr) {
                setRevisionNotice(`Official Update: ${gameTitle} 2nd Round revised from ${oldG.sr} to ${newG.sr}`);
              }
            }
            return fresh;
          });
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
          await new Promise((r) => setTimeout(r, 400 - elapsed));
        }
      }
      setIsRefreshing(false);
      setCurrentISTMinutes(getISTCurrentMinutes());
      setLastCheck(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  // Restore cache on mount + immediate background sync
  useEffect(() => {
    try {
      const saved = localStorage.getItem('teer_latest_live_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.date === initialData.date && parsed.games) {
          const initG = initialData.games[gameKey];
          const cacheG = parsed.games[gameKey];
          // Only adopt if cache has declared numbers and initial was 'xx'
          if (initG && cacheG && ((initG.fr === 'xx' && cacheG.fr !== 'xx') || (initG.sr === 'xx' && cacheG.sr !== 'xx'))) {
            setData(parsed);
          }
        }
      }
    } catch (e) {}

    fetchLatest(false);
  }, []);

  // Polling interval
  useEffect(() => {
    setLastCheck(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    const isAllDeclared = game.fr !== 'xx' && game.sr !== 'xx';
    const isFastUpdate = game.fr_verification === 'FAST_UPDATE' || game.sr_verification === 'FAST_UPDATE';
    const intervalMs = isAllDeclared || isSunday ? 60000 : ((isAnyDrawing || isFastUpdate) ? 5000 : 12000);

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
  }, [game.fr, game.sr, isSunday]);

  // WhatsApp share for this game
  const shareOnWhatsApp = () => {
    const isYesterday = viewMode === 'yesterday';
    const dateStr = isYesterday ? yesterdayFormattedDate : todayFormattedDate;
    let shareText = '';
    if (isSunday) {
      shareText = `🎯 *${meta.title} (LATEST OFFICIAL - ${dateStr})*\n`;
    } else {
      shareText = isYesterday
        ? `🎯 *${meta.title} (YESTERDAY - ${dateStr})*\n`
        : `🎯 *${meta.title} TODAY LIVE (${dateStr})*\n`;
    }

    shareText += `▶ 1st Round (${game.fr_time}): *${game.fr}*\n`;
    shareText += `▶ 2nd Round (${game.sr_time}): *${game.sr}*\n`;
    const pageUrl = gameKey === 'night' ? 'https://teerresultlive.in/shillong-night-teer' : `https://teerresultlive.in/${gameKey}-teer`;
    shareText += `\n⚡ Check official live numbers:\n👉 ${pageUrl}`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

    if (typeof navigator !== 'undefined' && navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      navigator
        .share({
          title: `${meta.title} Live Result`,
          text: shareText,
          url: gameKey === 'night' ? 'https://teerresultlive.in/shillong-night-teer' : `https://teerresultlive.in/${gameKey}-teer`
        })
        .catch(() => {
          window.open(whatsappUrl, '_blank');
        });
    } else {
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <div className="space-y-3 pt-1">
      {/* Top Action Bar (Toggle, WhatsApp, Refresh) */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 flex-nowrap">
        {/* Today / Yesterday Toggle Pills */}
        <div className="inline-flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200/80 shadow-2xs shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('today')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'today'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                viewMode === 'today' ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'
              }`}
            ></span>
            <span>{isSunday ? '🎯 Latest' : 'Today'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('yesterday')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'yesterday'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{isSunday ? 'Previous' : 'Yesterday'}</span>
          </button>
        </div>

        {/* Action Buttons: WhatsApp Share & Royal Blue Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={shareOnWhatsApp}
            className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white p-2 sm:px-2.5 sm:py-1.5 rounded-lg font-black text-[11px] sm:text-xs transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
            title={`Share ${meta.title} on WhatsApp`}
            aria-label="Share on WhatsApp"
          >
            <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {viewMode === 'today' && (
            <button
              type="button"
              onClick={() => fetchLatest(true)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-2 sm:px-2.5 sm:py-1.5 rounded-lg font-black text-[11px] sm:text-xs transition-all disabled:opacity-60 cursor-pointer shadow-xs border border-blue-500/80 active:scale-95 shrink-0"
              title="Refresh Live Results"
              aria-label="Refresh Live Results"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? 'animate-spin text-blue-200' : 'text-white'}`}
              />
              <span className="hidden min-[360px]:inline">
                {isRefreshing ? 'Checking...' : 'Refresh'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Date & Live Draw Status Strip */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 flex-wrap gap-2 text-slate-600">
        <div className="flex items-center gap-2 font-bold flex-wrap">
          <span
            className={`w-2.5 h-2.5 rounded-full ${viewMode === 'today' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}
          ></span>
          <span className="text-slate-900 font-extrabold text-xs sm:text-sm">
            Date: {viewMode === 'yesterday' ? yesterdayFormattedDate : todayFormattedDate}
          </span>

          {viewMode === 'today' ? (
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded font-black border flex items-center gap-1.5 shadow-2xs ${
                isAnyDrawing
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isSunday ? (
                '🏖️ SUNDAY HOLIDAY • LATEST OFFICIAL RESULT'
              ) : isAnyDrawing ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                  <span>🏹 LIVE SHOOTING & COUNTING ACTIVE</span>
                </>
              ) : (
                '⚡ LIVE FEED'
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

      {/* Morning Helper: In Today mode before game's draw, allow 1-tap toggle to yesterday */}
      {viewMode === 'today' && game.fr === 'xx' && !isSunday && yesterday && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">🏹</span>
            <span className="font-bold truncate text-[11px] sm:text-xs">
              Today's live draw begins at {meta.defaultFrTime} • View yesterday's declared result ({yesterdayFormattedDate})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('yesterday')}
            className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap cursor-pointer transition-all shrink-0 shadow-xs"
          >
            Yesterday ➔
          </button>
        </div>
      )}

      {/* When user toggles to yesterday: Banner to easily return to Today */}
      {viewMode === 'yesterday' && !isSunday && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">⏮️</span>
            <span className="font-bold truncate text-[11px] sm:text-xs">
              Showing Yesterday's Results ({yesterdayFormattedDate}) • Today's Live Draws Begin at {meta.defaultFrTime}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('today')}
            className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap cursor-pointer transition-all shrink-0 shadow-xs"
          >
            Today's Board ➔
          </button>
        </div>
      )}

      {/* Live Referee Revision Notice */}
      {revisionNotice && (
        <div className="bg-amber-500/15 border-2 border-amber-500/40 rounded-xl p-3 text-xs text-amber-950 flex items-center justify-between gap-2 shadow-xs animate-pulse max-w-md">
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">📢</span>
            <span className="font-bold text-[12px] sm:text-xs leading-tight">{revisionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setRevisionNotice(null)}
            className="text-amber-900 hover:text-black font-black px-2 py-0.5 rounded cursor-pointer shrink-0 text-sm"
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* FR & SR Result Box (Grid 2 cols) */}
      <div
        className={`grid grid-cols-2 gap-2 sm:gap-3 max-w-md transition-all rounded-2xl p-1 ${
          isAnyDrawing ? 'border-2 border-rose-400 ring-4 ring-rose-500/10 shadow-sm' : ''
        }`}
      >
        {/* 1st Round (FR) */}
        <div
          className={`rounded-xl p-3 text-center shadow-2xs transition-all relative overflow-hidden flex flex-col justify-between ${
            isFrDrawing
              ? 'bg-gradient-to-b from-amber-50/90 to-amber-100/60 border-2 border-amber-400 ring-2 ring-amber-400/20'
              : 'bg-amber-50/50 border border-amber-200/80'
          }`}
        >
          <div className="flex items-center justify-center gap-1 text-center">
            <span className="text-[10.5px] sm:text-xs font-black uppercase text-amber-900 tracking-tight whitespace-nowrap">
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
                  <span
                    className="text-3xl sm:text-4xl inline-block transform -rotate-45 animate-pulse select-none"
                    aria-hidden="true"
                  >
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
            <div>
              <span
                className={`text-3xl sm:text-4xl font-black font-mono block mt-1 tracking-tight ${
                  game.fr !== 'xx' ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                {game.fr}
              </span>
              {game.fr !== 'xx' && (
                <div className="flex items-center justify-center mt-1">
                  {game.fr_verification === 'FAST_UPDATE' ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-800 bg-amber-100/95 border border-amber-300 px-1.5 py-0.5 rounded-full shadow-2xs animate-pulse" title="Fast-Tracked from verified referee source">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      ⚡ Fast Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/90 px-1.5 py-0.5 rounded-full shadow-2xs" title="Confirmed by independent sources">
                      <svg className="w-2.5 h-2.5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      Verified
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2nd Round (SR) */}
        <div
          className={`rounded-xl p-3 text-center shadow-2xs transition-all relative overflow-hidden flex flex-col justify-between ${
            isSrDrawing
              ? 'bg-gradient-to-b from-emerald-50/90 to-emerald-100/60 border-2 border-emerald-400 ring-2 ring-emerald-400/20'
              : 'bg-emerald-50/50 border border-emerald-200/80'
          }`}
        >
          <div className="flex items-center justify-center gap-1 text-center">
            <span className="text-[10.5px] sm:text-xs font-black uppercase text-emerald-900 tracking-tight whitespace-nowrap">
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
                  <span
                    className="text-3xl sm:text-4xl inline-block transform -rotate-45 animate-pulse select-none"
                    aria-hidden="true"
                  >
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
            <div>
              <span
                className={`text-3xl sm:text-4xl font-black font-mono block mt-1 tracking-tight ${
                  game.sr !== 'xx' ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {game.sr}
              </span>
              {game.sr !== 'xx' && (
                <div className="flex items-center justify-center mt-1">
                  {game.sr_verification === 'FAST_UPDATE' ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-800 bg-emerald-100/95 border border-emerald-300 px-1.5 py-0.5 rounded-full shadow-2xs animate-pulse" title="Fast-Tracked from verified referee source">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      ⚡ Fast Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/90 px-1.5 py-0.5 rounded-full shadow-2xs" title="Confirmed by independent sources">
                      <svg className="w-2.5 h-2.5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      Verified
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Layout B: Single horizontal yesterday reference strip (auto-hides when live draws start or when results declare) */}
      {viewMode === 'today' && game.fr === 'xx' && game.sr === 'xx' && !isAnyDrawing && !isSunday && yestFr && yestSr && yestFr !== 'xx' && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60 max-w-md flex-wrap gap-1">
          <span className="font-semibold text-slate-500 flex items-center gap-1">
            <span>🏛️</span>
            <span>Yesterday:</span>
          </span>
          <div className="flex items-center gap-2 font-mono font-bold text-slate-800">
            <span>1st <span className="text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-200/60">{yestFr}</span></span>
            <span className="text-slate-300">•</span>
            <span>2nd <span className="text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200/60">{yestSr}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
