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
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-slate-900 shadow-xs space-y-4">
      
      {/* Title & Microcopy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
            <span>🌙</span>
            <span>Teer Dream Number Calculator</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search your dream symbols to find traditional lucky Direct, House, and Ending numbers.
          </p>
        </div>

        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full self-start sm:self-auto shadow-2xs">
          {filtered.length} Dream Meanings
        </span>
      </div>

      {/* Instant Search Bar */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your dream (e.g. Snake, Water, Fish, River, Money)..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 pl-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            🔍
          </span>
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Multilingual Support & Quick Preset Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 px-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-600">Popular:</span>
            {['Snake', 'Water', 'Money', 'Fish', 'Fire', 'Dog', 'Tiger'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setQuery(p)}
                className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold transition-colors cursor-pointer ${
                  query.toLowerCase() === p.toLowerCase()
                    ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-slate-400 font-medium">
            Search in: English • অসমীয়া • বাংলা • हिंदी
          </span>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {filtered.length > 0 ? (
          filtered.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-100/70 hover:border-slate-300 transition-colors"
            >
              <div>
                <span className="font-bold text-sm text-slate-900 block">
                  {item.keyword}
                </span>
                <span className="text-xs text-slate-500 font-medium">
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
                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300/80 font-mono text-xs font-black px-1.5 py-0.5 rounded cursor-pointer transition-colors shadow-2xs active:scale-95"
                        title="Click to copy"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">House:</span>
                  <span className="bg-slate-200 text-slate-800 font-mono text-xs font-bold px-2 py-0.5 rounded shadow-2xs">
                    {item.house.join(', ')}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Ending:</span>
                  <span className="bg-slate-200 text-slate-800 font-mono text-xs font-bold px-2 py-0.5 rounded shadow-2xs">
                    {item.ending.join(', ')}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs">
            <p className="font-medium">No exact dream match found for "{query}".</p>
            <p className="text-[11px] text-slate-400 mt-1">Try searching for keywords like "Water", "Snake", "Money", or "Fish".</p>
          </div>
        )}
      </div>

      {copiedNumber && (
        <div className="fixed bottom-20 md:bottom-4 right-4 bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg animate-in fade-in z-50">
          Copied number {copiedNumber}! ✓
        </div>
      )}

    </div>
  );
}
