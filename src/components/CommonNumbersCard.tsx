import React from 'react';
import liveData from '../data/teer_live_results.json';

export default function CommonNumbersCard() {
  const shillongCommon = liveData.games.shillong?.common_numbers || { direct: ['20', '96'], house: [2, 9], ending: [0, 6] };
  const khanaparaCommon = liveData.games.khanapara?.common_numbers || { direct: ['64', '17'], house: [6, 1], ending: [4, 7] };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-sm space-y-4">
      
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
            <span>🎯</span>
            <span>Today's Teer Common Numbers (টার্গেট নম্বর)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Mathematical target numbers derived from previous hit formula (Direct, House, Ending).
          </p>
        </div>

        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
          Today's Formula
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        {/* Shillong Common Numbers */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <h3 className="text-xs font-black text-amber-400 uppercase tracking-wide">
              Shillong Teer Targets
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">FR &amp; SR</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
              <span className="text-slate-400 font-bold">Direct Numbers:</span>
              <div className="flex items-center gap-1 font-mono font-black text-amber-300">
                {shillongCommon.direct.map(n => (
                  <span key={n} className="bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
              <span className="text-slate-400 font-bold">House:</span>
              <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                {shillongCommon.house.join(', ')}
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
              <span className="text-slate-400 font-bold">Ending:</span>
              <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                {shillongCommon.ending.join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Khanapara Common Numbers */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wide">
              Khanapara Teer Targets
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">FR &amp; SR</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
              <span className="text-slate-400 font-bold">Direct Numbers:</span>
              <div className="flex items-center gap-1 font-mono font-black text-emerald-300">
                {khanaparaCommon.direct.map(n => (
                  <span key={n} className="bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
              <span className="text-slate-400 font-bold">House:</span>
              <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                {khanaparaCommon.house.join(', ')}
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-lg">
              <span className="text-slate-400 font-bold">Ending:</span>
              <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                {khanaparaCommon.ending.join(', ')}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
