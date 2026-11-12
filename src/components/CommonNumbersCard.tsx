import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import liveData from '../data/teer_live_results.json';

interface CommonNumbersCardProps {
  filterGame?: 'all' | 'shillong' | 'khanapara' | 'juwai' | 'juwai_morning' | 'night';
}

interface CommonData {
  direct: string[];
  house: number[];
  ending: number[];
}

const DEFAULT_TARGETS: Record<string, { title: string; color: string; badge: string; common: CommonData }> = {
  shillong: {
    title: 'Shillong Teer Targets',
    color: 'amber',
    badge: 'Polo Ground Formula',
    common: { direct: ['03', '58', '72', '27', '85', '30'], house: [0, 5, 7], ending: [3, 8, 2] }
  },
  khanapara: {
    title: 'Khanapara Teer Targets',
    color: 'emerald',
    badge: 'Assam Border Formula',
    common: { direct: ['31', '84', '96', '49', '13', '68'], house: [3, 8, 9], ending: [1, 4, 6] }
  },
  juwai: {
    title: 'Juwai Teer Targets',
    color: 'blue',
    badge: 'West Jaintia Formula',
    common: { direct: ['40', '92', '57', '05', '29', '74'], house: [4, 9, 5], ending: [0, 2, 7] }
  },
  juwai_morning: {
    title: 'Juwai Morning Targets',
    color: 'teal',
    badge: 'Morning Archery Formula',
    common: { direct: ['27', '41', '68', '19', '53', '80'], house: [2, 4, 6], ending: [7, 1, 8] }
  },
  night: {
    title: 'Night Teer Targets',
    color: 'purple',
    badge: 'Night Archery Formula',
    common: { direct: ['21', '45', '89', '12', '54', '98'], house: [2, 4, 8], ending: [1, 5, 9] }
  }
};

export default function CommonNumbersCard({ filterGame = 'all' }: CommonNumbersCardProps) {
  const [activeTab, setActiveTab] = useState<'shillong' | 'khanapara' | 'juwai' | 'juwai_morning' | 'night'>(
    filterGame === 'all' ? 'shillong' : filterGame
  );
  const [copiedGame, setCopiedGame] = useState<string | null>(null);

  // Extract from liveData with fallback
  const getGameCommon = (key: string): CommonData => {
    const raw = (liveData.games as any)?.[key]?.common_numbers;
    if (raw && Array.isArray(raw.direct) && raw.direct.length > 0) {
      return raw;
    }
    return DEFAULT_TARGETS[key]?.common || { direct: ['00', '11'], house: [0, 1], ending: [0, 1] };
  };

  const copyCommon = (key: string, title: string) => {
    const data = getGameCommon(key);
    const text = `🎯 *${title.toUpperCase()} (TODAY)*\n▶ Direct: ${data.direct.join(', ')}\n▶ House: ${data.house.join(', ')}\n▶ Ending: ${data.ending.join(', ')}\n⚡ Check official live results: https://teerresultlive.in`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedGame(key);
      setTimeout(() => setCopiedGame(null), 2000);
    }
  };

  // If filterGame is passed and not 'all', render game-specific view with quick switch pills
  const isSinglePage = filterGame !== 'all';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-slate-900 shadow-xs space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
            <span>🎯</span>
            <span>
              {isSinglePage
                ? `${DEFAULT_TARGETS[filterGame]?.title || 'Teer'} Today`
                : "Today's Teer Common Numbers"}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mathematical target numbers derived from previous hit formula (Direct, House, Ending).
          </p>
        </div>

        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full shadow-2xs self-start sm:self-auto">
          Today's Formula
        </span>
      </div>

      {/* Game Selector Pills */}
      <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0 bg-slate-50 border border-slate-200/80 rounded-xl p-1.5">
        {(['shillong', 'khanapara', 'juwai', 'juwai_morning', 'night'] as const).map((key) => {
          const isActive = activeTab === key;
          const label = key === 'shillong' ? 'Shillong' : key === 'khanapara' ? 'Khanapara' : key === 'juwai' ? 'Juwai' : key === 'juwai_morning' ? 'Juwai Morning' : 'Night';
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1 rounded-lg font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 text-xs ${
                isActive
                  ? key === 'shillong'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : key === 'khanapara'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : key === 'juwai'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : key === 'juwai_morning'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Game Target Card */}
      {(() => {
        const item = DEFAULT_TARGETS[activeTab];
        const data = getGameCommon(activeTab);
        const isCopied = copiedGame === activeTab;

        return (
          <div
            className={`rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs border transition-all ${
              activeTab === 'shillong'
                ? 'bg-amber-50/40 border-amber-200/80'
                : activeTab === 'khanapara'
                ? 'bg-emerald-50/40 border-emerald-200/80'
                : activeTab === 'juwai'
                ? 'bg-blue-50/40 border-blue-200/80'
                : activeTab === 'juwai_morning'
                ? 'bg-teal-50/40 border-teal-200/80'
                : 'bg-purple-50/40 border-purple-200/80'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2 border-slate-200/70">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    {item.title}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold">{item.badge}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyCommon(activeTab, item.title)}
                className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Copy Target Numbers"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 text-[11px] font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[11px]">Copy Numbers</span>
                  </>
                )}
              </button>
            </div>

            {/* Direct Numbers Grid */}
            <div className="space-y-1.5">
              <span className="text-xs font-extrabold text-slate-700 block">
                Direct Hit Targets (FR &amp; SR):
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {data.direct.map((num) => (
                  <span
                    key={num}
                    className={`font-mono font-black text-sm sm:text-base px-2.5 py-1 rounded-xl shadow-xs border ${
                      activeTab === 'shillong'
                        ? 'bg-amber-100 text-amber-950 border-amber-300'
                        : activeTab === 'khanapara'
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                        : activeTab === 'juwai'
                        ? 'bg-blue-100 text-blue-950 border-blue-300'
                        : 'bg-purple-100 text-purple-950 border-purple-300'
                    }`}
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>

            {/* House & Ending Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">House (10s Digit):</span>
                  <span className="text-[10px] text-slate-400">Tens place prediction</span>
                </div>
                <div className="flex items-center gap-1 font-mono font-black text-sm">
                  {data.house.map((h) => (
                    <span key={h} className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-slate-900">
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-xs font-bold text-slate-600 block">Ending (Units Digit):</span>
                  <span className="text-[10px] text-slate-400">Units place prediction</span>
                </div>
                <div className="flex items-center gap-1 font-mono font-black text-sm">
                  {data.ending.map((e) => (
                    <span key={e} className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-slate-900">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Practical Usage Formula Tip */}
            <div className="bg-white/80 border border-slate-200/60 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800 flex items-center gap-1">
                <span>💡</span>
                <span>How to Use House &amp; Ending Formula:</span>
              </p>
              <p className="leading-relaxed">
                Combine the predicted <strong>House</strong> digits with <strong>Ending</strong> digits to form high-probability target pairs. For example, pairing House {data.house[0]} with Ending {data.ending[0]} creates target number <strong>{data.house[0]}{data.ending[0]}</strong>.
              </p>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
