import React, { useState, useMemo } from 'react';
import archive from '../data/previous_teer_archive.json';

export default function PreviousResultsTable() {
  const [searchNumber, setSearchNumber] = useState('');
  const [activeGame, setActiveGame] = useState<'all' | 'shillong' | 'khanapara' | 'juwai' | 'night'>('all');
  const [showAll, setShowAll] = useState(false);

  // Filtered rows based on game and number query
  const filteredRows = useMemo(() => {
    let rows = archive;
    const q = searchNumber.trim();

    if (q) {
      rows = rows.filter((row) => {
        if (activeGame === 'shillong') {
          return row.shillong_fr?.includes(q) || row.shillong_sr?.includes(q);
        }
        if (activeGame === 'khanapara') {
          return row.khanapara_fr?.includes(q) || row.khanapara_sr?.includes(q);
        }
        if (activeGame === 'juwai') {
          return row.juwai_fr?.includes(q) || row.juwai_sr?.includes(q);
        }
        if (activeGame === 'night') {
          return row.night_fr?.includes(q) || row.night_sr?.includes(q);
        }
        return (
          row.shillong_fr?.includes(q) ||
          row.shillong_sr?.includes(q) ||
          row.khanapara_fr?.includes(q) ||
          row.khanapara_sr?.includes(q) ||
          row.juwai_fr?.includes(q) ||
          row.juwai_sr?.includes(q) ||
          row.night_fr?.includes(q) ||
          row.night_sr?.includes(q)
        );
      });
    }

    return showAll ? rows : rows.slice(0, 10);
  }, [searchNumber, activeGame, showAll]);

  // Frequency counter for searched number
  const hitStats = useMemo(() => {
    const q = searchNumber.trim();
    if (!q || q.length < 1) return null;

    let totalHits = 0;
    const gameHits: Record<string, number> = { shillong: 0, khanapara: 0, juwai: 0, night: 0 };

    for (const row of archive) {
      if (row.shillong_fr === q || row.shillong_sr === q) {
        totalHits++;
        gameHits.shillong++;
      }
      if (row.khanapara_fr === q || row.khanapara_sr === q) {
        totalHits++;
        gameHits.khanapara++;
      }
      if (row.juwai_fr === q || row.juwai_sr === q) {
        totalHits++;
        gameHits.juwai++;
      }
      if (row.night_fr === q || row.night_sr === q) {
        totalHits++;
        gameHits.night++;
      }
    }

    return { totalHits, gameHits };
  }, [searchNumber]);

  const isMatched = (num?: string) => {
    if (!searchNumber.trim() || !num) return false;
    return num.includes(searchNumber.trim());
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-slate-900 shadow-xs space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
            <span>📊</span>
            <span>Previous Teer Hit Numbers</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter by game or search any 2-digit number to analyze historical hit frequencies.
          </p>
        </div>

        <a
          href="/previous-results"
          className="text-xs font-black text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-2xs self-start sm:self-auto"
        >
          <span>Full Archive (30 Days)</span>
          <span>➔</span>
        </a>
      </div>

      {/* Interactive Controls Bar: Game Tabs + Instant Number Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
        
        {/* Game Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveGame('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              activeGame === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            All Games
          </button>
          <button
            type="button"
            onClick={() => setActiveGame('shillong')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              activeGame === 'shillong'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Shillong
          </button>
          <button
            type="button"
            onClick={() => setActiveGame('khanapara')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              activeGame === 'khanapara'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Khanapara
          </button>
          <button
            type="button"
            onClick={() => setActiveGame('juwai')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              activeGame === 'juwai'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            Juwai
          </button>
        </div>

        {/* Number Search Box */}
        <div className="relative sm:w-64">
          <input
            type="text"
            maxLength={2}
            value={searchNumber}
            onChange={(e) => setSearchNumber(e.target.value)}
            placeholder="Search number (e.g. 20, 96)..."
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 pl-8 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
            🔍
          </span>
          {searchNumber && (
            <button
              type="button"
              onClick={() => setSearchNumber('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

      </div>

      {/* Hit Frequency Insight Pill */}
      {hitStats && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-xs text-amber-950 flex items-center justify-between flex-wrap gap-2 animate-in fade-in">
          <div className="flex items-center gap-1.5 font-bold">
            <span>🎯</span>
            <span>
              Number <strong className="font-mono text-amber-900 bg-amber-200 px-1 rounded">{searchNumber}</strong> appeared{' '}
              <strong>{hitStats.totalHits} times</strong> in past 30 days!
            </span>
          </div>
          <span className="text-[11px] text-amber-800 font-semibold">
            Shillong: {hitStats.gameHits.shillong}x • Khanapara: {hitStats.gameHits.khanapara}x • Juwai: {hitStats.gameHits.juwai}x
          </span>
        </div>
      )}

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden font-mono">
          <thead className="bg-slate-50 text-slate-700 font-black uppercase tracking-wider text-[11px] border-b border-slate-200">
            <tr>
              <th className="p-2.5 sm:p-3">Date</th>
              {(activeGame === 'all' || activeGame === 'shillong') && (
                <th className="p-2.5 sm:p-3 text-amber-800">Shillong (FR / SR)</th>
              )}
              {(activeGame === 'all' || activeGame === 'khanapara') && (
                <th className="p-2.5 sm:p-3 text-emerald-800">Khanapara (FR / SR)</th>
              )}
              {(activeGame === 'all' || activeGame === 'juwai') && (
                <th className="p-2.5 sm:p-3 text-blue-800">Juwai (FR / SR)</th>
              )}
              {activeGame === 'all' && (
                <th className="p-2.5 sm:p-3 text-purple-800">Night (FR / SR)</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-2.5 sm:p-3 font-bold text-slate-500 whitespace-nowrap">
                    {row.date.split('-').reverse().join('/')}
                  </td>

                  {(activeGame === 'all' || activeGame === 'shillong') && (
                    <td className={`p-2.5 sm:p-3 font-black text-amber-700 ${
                      isMatched(row.shillong_fr) || isMatched(row.shillong_sr) ? 'bg-amber-100/70 font-extrabold' : ''
                    }`}>
                      <span className={isMatched(row.shillong_fr) ? 'bg-amber-300 px-1 rounded' : ''}>
                        {row.shillong_fr}
                      </span>
                      {' / '}
                      <span className={isMatched(row.shillong_sr) ? 'bg-amber-300 px-1 rounded' : ''}>
                        {row.shillong_sr}
                      </span>
                    </td>
                  )}

                  {(activeGame === 'all' || activeGame === 'khanapara') && (
                    <td className={`p-2.5 sm:p-3 font-black text-emerald-700 ${
                      isMatched(row.khanapara_fr) || isMatched(row.khanapara_sr) ? 'bg-emerald-100/70 font-extrabold' : ''
                    }`}>
                      <span className={isMatched(row.khanapara_fr) ? 'bg-emerald-300 px-1 rounded' : ''}>
                        {row.khanapara_fr}
                      </span>
                      {' / '}
                      <span className={isMatched(row.khanapara_sr) ? 'bg-emerald-300 px-1 rounded' : ''}>
                        {row.khanapara_sr}
                      </span>
                    </td>
                  )}

                  {(activeGame === 'all' || activeGame === 'juwai') && (
                    <td className={`p-2.5 sm:p-3 font-black text-blue-700 ${
                      isMatched(row.juwai_fr) || isMatched(row.juwai_sr) ? 'bg-blue-100/70 font-extrabold' : ''
                    }`}>
                      <span className={isMatched(row.juwai_fr) ? 'bg-blue-300 px-1 rounded' : ''}>
                        {row.juwai_fr}
                      </span>
                      {' / '}
                      <span className={isMatched(row.juwai_sr) ? 'bg-blue-300 px-1 rounded' : ''}>
                        {row.juwai_sr}
                      </span>
                    </td>
                  )}

                  {activeGame === 'all' && (
                    <td className={`p-2.5 sm:p-3 font-black text-purple-700 ${
                      isMatched(row.night_fr) || isMatched(row.night_sr) ? 'bg-purple-100/70 font-extrabold' : ''
                    }`}>
                      <span className={isMatched(row.night_fr) ? 'bg-purple-300 px-1 rounded' : ''}>
                        {row.night_fr || 'xx'}
                      </span>
                      {' / '}
                      <span className={isMatched(row.night_sr) ? 'bg-purple-300 px-1 rounded' : ''}>
                        {row.night_sr || 'xx'}
                      </span>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500 font-sans text-xs">
                  No hits found matching number "{searchNumber}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Expand / Collapse Button */}
      {archive.length > 10 && !searchNumber && (
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            {showAll ? '▲ Show Fewer (Top 10)' : `▼ Show Full 30-Day Archive (${archive.length} Draws)`}
          </button>
        </div>
      )}

    </div>
  );
}
