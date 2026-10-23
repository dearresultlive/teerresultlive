import React, { useState, useMemo } from 'react';
import dreamList from '../data/dream_numbers.json';

export default function DreamNumberSearch() {
  const [query, setQuery] = useState('');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return dreamList;
    const q = query.toLowerCase().trim();
    return dreamList.filter(item => 
      item.keyword.toLowerCase().includes(q) ||
      item.bengali.toLowerCase().includes(q) ||
      item.hindi.toLowerCase().includes(q) ||
      item.direct.some(d => d.includes(q))
    );
  }, [query]);

  const handleCopy = (num: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(num);
      setCopiedNumber(num);
      setTimeout(() => setCopiedNumber(null), 2000);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-sm space-y-4">
      
      {/* Title & Microcopy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
            <span>🌙</span>
            <span>Teer Dream Number Calculator (সপ্নের নম্বর)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Search your dream in English, Bengali, or Hindi to find traditional lucky numbers.
          </p>
        </div>

        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full self-start sm:self-auto">
          {filtered.length} Dream Meanings
        </span>
      </div>

      {/* Instant Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your dream (e.g. Snake, Water, Fish, টাকা, আগুন, सांप)..."
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-medium"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
          🔍
        </span>
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer p-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results List */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {filtered.length > 0 ? (
          filtered.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-700 transition-colors"
            >
              <div>
                <span className="font-bold text-sm text-white block">
                  {item.keyword}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {item.bengali} • {item.hindi}
                </span>
              </div>

              {/* Numbers: Direct / House / Ending */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Direct:</span>
                  <div className="flex items-center gap-1">
                    {item.direct.map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleCopy(num)}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-xs font-black px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        title="Click to copy"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">House:</span>
                  <span className="bg-slate-800 text-slate-200 font-mono text-xs font-bold px-1.5 py-0.5 rounded">
                    {item.house.join(', ')}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Ending:</span>
                  <span className="bg-slate-800 text-slate-200 font-mono text-xs font-bold px-1.5 py-0.5 rounded">
                    {item.ending.join(', ')}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs">
            <p>No exact dream match found for "{query}".</p>
            <p className="text-[11px] text-slate-600 mt-1">Try searching for keywords like "Water", "Snake", "Money", or "Fish".</p>
          </div>
        )}
      </div>

      {copiedNumber && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in">
          Copied number {copiedNumber}! ✓
        </div>
      )}

    </div>
  );
}
