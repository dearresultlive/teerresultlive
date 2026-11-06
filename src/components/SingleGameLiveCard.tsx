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

  // Auto-default to 'yesterday' in morning hours (before 1:00 PM IST) so users immediately see declared numbers
  const [viewMode, setViewMode] = useState<'today' | 'yesterday'>(() => {
    const nowMin = getISTCurrentMinutes();
    return (!isSunday && nowMin < 13 * 60) ? 'yesterday' : 'today';
  });

  // Dynamic H1 Label & Date Synchronization (solves Issue 1 for dedicated game pages)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const liveLabel = document.getElementById('game-live-label');
      const dateLabel = document.getElementById('game-date-label');
      if (liveLabel) {
        liveLabel.textContent = viewMode === 'yesterday' ? 'Yesterday' : (isSunday ? 'Latest' : 'Today Live');
      }
      if (dateLabel) {
        dateLabel.textContent = viewMode === 'yesterday' ? yesterdayFormattedDate : todayFormattedDate;
      }
    }
  }, [viewMode, yesterdayFormattedDate, todayFormattedDate, isSunday]);

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
        status: frVal !== 'xx' ? 'DECLARED' : 'UPCOMING'
      };
    }
    return data.games[gameKey] || {
      name: meta.title,
      location: meta.location,
      status: 'UPCOMING',
      fr_time: meta.defaultFrTime,
      sr_time: meta.defaultSrTime,
      fr: 'xx',
      sr: 'xx'
    };
  }, [viewMode, yesterday, data.games, gameKey, meta]);

  const isDeclared = game.fr !== 'xx' && game.sr !== 'xx';
  const isFrDeclared = game.fr !== 'xx' && game.sr === 'xx';
  const isSundayOff = isSunday && !isDeclared && !isFrDeclared;

  const isFrDrawing = checkIsDrawing(gameKey, 'fr', game.fr, currentISTMinutes, viewMode === 'today', isSunday);
  const isSrDrawing = checkIsDrawing(gameKey, 'sr', game.sr, currentISTMinutes, viewMode === 'today', isSunday);
  const isAnyDrawing = (isFrDrawing || isSrDrawing) && viewMode === 'today' && !isSunday;

  // Real-time zero-refresh polling fetcher
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
        if (parsed && parsed.games) {
          setData(parsed);
        }
      }
    } catch (e) {}

    fetchLatest(false);
  }, []);

  // Polling interval
  useEffect(() => {
    setLastCheck(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    const isAllDeclared = game.fr !== 'xx' && game.sr !== 'xx';
    const intervalMs = isAllDeclared || isSunday ? 60000 : 15000;

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

  const yesterdayFr = yesterday ? yesterday[`${gameKey}_fr`] || 'xx' : 'xx';
  const yesterdaySr = yesterday ? yesterday[`${gameKey}_sr`] || 'xx' : 'xx';

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
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-2.5 py-1.5 rounded-lg font-black text-[11px] sm:text-xs transition-all disabled:opacity-60 cursor-pointer shadow-xs border border-blue-500/80 active:scale-95"
              title="Refresh Live Results"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? 'animate-spin text-blue-200' : 'text-white'}`}
              />
              <span>{isRefreshing ? 'Checking...' : 'Refresh'}</span>
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

      {/* Morning Mode Banner */}
      {viewMode === 'yesterday' && currentISTMinutes < 13 * 60 && !isSunday && (
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
            <span
              className={`text-3xl sm:text-4xl font-black font-mono block mt-1 tracking-tight ${
                game.fr !== 'xx' ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              {game.fr}
            </span>
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
            <span
              className={`text-3xl sm:text-4xl font-black font-mono block mt-1 tracking-tight ${
                game.sr !== 'xx' ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {game.sr}
            </span>
          )}
        </div>
      </div>

      {/* Yesterday Result Strip (Only shown on Today view to provide yesterday's context) */}
      {viewMode === 'today' && yesterday && (
        <div className="bg-gradient-to-r from-amber-50/80 via-slate-50 to-emerald-50/80 border-2 border-slate-200 rounded-xl p-3 max-w-md flex items-center justify-between text-xs shadow-xs mt-2">
          <span className="text-slate-800 font-black text-xs flex items-center gap-1.5 uppercase tracking-wide">
            <span className="text-amber-600 text-sm">⏮️</span>
            <span>Yesterday ({yesterdayFormattedDate}):</span>
          </span>
          <div className="font-mono font-black text-xs flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-amber-500 text-white px-2.5 py-1 rounded-md shadow-xs">
              <span className="text-[10px] font-bold opacity-90">FR</span>
              <span className="text-sm font-black">{yesterdayFr}</span>
            </span>
            <span className="inline-flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1 rounded-md shadow-xs">
              <span className="text-[10px] font-bold opacity-90">SR</span>
              <span className="text-sm font-black">{yesterdaySr}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
