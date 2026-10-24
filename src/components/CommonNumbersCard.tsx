import React from 'react';
import liveData from '../data/teer_live_results.json';

export default function CommonNumbersCard() {
  const shillongCommon = liveData.games.shillong?.common_numbers || { direct: ['20', '96', '71', '14', '76', '19'], house: [7, 1], ending: [1, 9] };
  const khanaparaCommon = liveData.games.khanapara?.common_numbers || { direct: ['31', '42', '58', '90', '63', '27'], house: [3, 4], ending: [1, 2] };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-slate-900 shadow-xs space-y-4">
      
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
            <span>🎯</span>
            <span>Today's Teer Common Numbers (টার্গেট নম্বর)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mathematical target numbers derived from previous hit formula (Direct, House, Ending).
          </p>
        </div>

        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full shadow-2xs">
          Today's Formula
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        
        {/* Shillong Common Numbers */}
        <div className="bg-amber-50/30 border border-amber-200/70 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-amber-200/50 pb-1.5">
            <h3 className="text-xs font-black text-amber-800 uppercase tracking-wide flex items-center gap-1">
              <span>🎯</span>
              <span>Shillong Teer Targets</span>
            </h3>
            <span className="text-[10px] text-amber-700 font-bold bg-amber-100/60 px-1.5 py-0.5 rounded">FR &amp; SR</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between bg-white border border-amber-100/80 p-2 rounded-lg shadow-2xs">
              <span className="text-slate-600 font-bold">Direct Numbers:</span>
              <div className="flex items-center gap-1 font-mono font-black text-amber-900 flex-wrap justify-end">
                {shillongCommon.direct.map(n => (
                  <span key={n} className="bg-amber-100 border border-amber-300/80 px-1.5 py-0.5 rounded text-xs shadow-2xs">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between bg-white border border-slate-200/70 p-2 rounded-lg shadow-2xs">
              <span className="text-slate-600 font-bold">House:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
                {shillongCommon.house.join(', ')}
              </span>
            </div>

            <div className="flex items-center justify-between bg-white border border-slate-200/70 p-2 rounded-lg shadow-2xs">
              <span className="text-slate-600 font-bold">Ending:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
                {shillongCommon.ending.join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Khanapara Common Numbers */}
        <div className="bg-emerald-50/30 border border-emerald-200/70 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-emerald-200/50 pb-1.5">
            <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1">
              <span>🎯</span>
              <span>Khanapara Teer Targets</span>
            </h3>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/60 px-1.5 py-0.5 rounded">FR &amp; SR</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between bg-white border border-emerald-100/80 p-2 rounded-lg shadow-2xs">
              <span className="text-slate-600 font-bold">Direct Numbers:</span>
              <div className="flex items-center gap-1 font-mono font-black text-emerald-900 flex-wrap justify-end">
                {khanaparaCommon.direct.map(n => (
                  <span key={n} className="bg-emerald-100 border border-emerald-300/80 px-1.5 py-0.5 rounded text-xs shadow-2xs">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between bg-white border border-slate-200/70 p-2 rounded-lg shadow-2xs">
              <span className="text-slate-600 font-bold">House:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
                {khanaparaCommon.house.join(', ')}
              </span>
            </div>

            <div className="flex items-center justify-between bg-white border border-slate-200/70 p-2 rounded-lg shadow-2xs">
              <span className="text-slate-600 font-bold">Ending:</span>
              <span className="font-mono font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
                {khanaparaCommon.ending.join(', ')}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
