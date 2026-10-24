import React, { useState, useMemo } from 'react';

export default function TeerFormulaCalculator() {
  const [frInput, setFrInput] = useState('20');
  const [srInput, setSrInput] = useState('96');
  const [copied, setCopied] = useState(false);

  // Quick preset loader
  const loadPreset = (fr: string, sr: string) => {
    setFrInput(fr);
    setSrInput(sr);
  };

  // Mathematical formula calculations
  const calculation = useMemo(() => {
    const fr = parseInt(frInput, 10);
    const sr = parseInt(srInput, 10);

    if (isNaN(fr) || isNaN(sr) || fr < 0 || fr > 99 || sr < 0 || sr > 99) {
      return null;
    }

    const h1 = Math.floor(fr / 10);
    const h2 = Math.floor(sr / 10);
    const sumH = (h1 + h2) % 10;
    const cutH = (sumH + 5) % 10;
    const houses = Array.from(new Set([h1, h2, sumH, cutH])).slice(0, 3);

    const e1 = fr % 10;
    const e2 = sr % 10;
    const sumE = (e1 + e2) % 10;
    const cutE = (sumE + 5) % 10;
    const endings = Array.from(new Set([e1, e2, sumE, cutE])).slice(0, 3);

    // Direct combinations
    const directSet = new Set<string>();
    
    // Sum & Difference hit numbers
    const sumNum = ((fr + sr) % 100).toString().padStart(2, '0');
    const diffNum = Math.abs(fr - sr).toString().padStart(2, '0');
    directSet.add(sumNum);
    directSet.add(diffNum);

    // Cross-product of top houses & endings
    for (const h of houses) {
      for (const e of endings) {
        directSet.add(`${h}${e}`);
        if (directSet.size >= 8) break;
      }
      if (directSet.size >= 8) break;
    }

    const directs = Array.from(directSet).slice(0, 6);

    return {
      houses,
      endings,
      directs,
      sumNum,
      diffNum
    };
  }, [frInput, srInput]);

  const handleSharePrediction = () => {
    if (!calculation) return;
    const text = `🎯 *MY TEER FORMULA PREDICTION*\n` +
      `Based on FR: ${frInput} & SR: ${srInput}\n\n` +
      `🏠 Houses: ${calculation.houses.join(', ')}\n` +
      `🎯 Endings: ${calculation.endings.join(', ')}\n` +
      `🔢 Direct Numbers: ${calculation.directs.join(', ')}\n\n` +
      `Calculate your lucky formula live:\n👉 https://teerresultlive.in/#formula-calculator`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    if (typeof navigator !== 'undefined' && navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      navigator.share({ title: 'Teer Formula Prediction', text, url: 'https://teerresultlive.in' }).catch(() => {
        window.open(whatsappUrl, '_blank');
      });
    } else {
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleCopyPrediction = () => {
    if (!calculation || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const text = `Teer Target Prediction (FR: ${frInput}, SR: ${srInput})\n` +
      `Houses: ${calculation.houses.join(', ')} | Endings: ${calculation.endings.join(', ')}\n` +
      `Directs: ${calculation.directs.join(', ')}\nhttps://teerresultlive.in`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="formula-calculator" className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-slate-900 shadow-xs space-y-4">
      
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
            <span>🧮</span>
            <span>Teer Formula &amp; Target Calculator</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter previous draw numbers to calculate today's House, Ending, and Direct probabilities.
          </p>
        </div>

        <span className="text-[10px] font-black text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full self-start sm:self-auto shadow-2xs">
          Interactive Formula Tool
        </span>
      </div>

      {/* Input Section */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Previous 1st Round (FR):
            </label>
            <input
              type="number"
              min="0"
              max="99"
              value={frInput}
              onChange={(e) => setFrInput(e.target.value.slice(0, 2))}
              placeholder="e.g. 20"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono font-black text-lg text-amber-600 focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-center"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Previous 2nd Round (SR):
            </label>
            <input
              type="number"
              min="0"
              max="99"
              value={srInput}
              onChange={(e) => setSrInput(e.target.value.slice(0, 2))}
              placeholder="e.g. 96"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono font-black text-lg text-emerald-600 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-center"
            />
          </div>
        </div>

        {/* Quick Pre-fill presets */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
          <span className="text-[10px] font-bold text-slate-500">Quick Auto-Fill:</span>
          <button
            type="button"
            onClick={() => loadPreset('20', '96')}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Shillong (20/96)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('31', '42')}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Khanapara (31/42)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('83', '28')}
            className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Juwai (83/28)
          </button>
        </div>
      </div>

      {/* Calculated Output Cards */}
      {calculation ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Predicted House */}
            <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-3 text-center shadow-2xs">
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
                Calculated House
              </span>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                {calculation.houses.map((h) => (
                  <span key={h} className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-mono font-black text-base flex items-center justify-center shadow-2xs">
                    {h}
                  </span>
                ))}
              </div>
            </div>

            {/* Predicted Ending */}
            <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-3 text-center shadow-2xs">
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                Calculated Ending
              </span>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                {calculation.endings.map((e) => (
                  <span key={e} className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono font-black text-base flex items-center justify-center shadow-2xs">
                    {e}
                  </span>
                ))}
              </div>
            </div>

            {/* Sum & Difference Root */}
            <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-3 text-center shadow-2xs">
              <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider block">
                Sum / Diff Root
              </span>
              <div className="flex items-center justify-center gap-1.5 mt-1.5 font-mono font-black text-sm text-blue-900">
                <span className="bg-blue-100 border border-blue-300 px-2 py-1 rounded shadow-2xs">
                  +{calculation.sumNum}
                </span>
                <span className="bg-blue-100 border border-blue-300 px-2 py-1 rounded shadow-2xs">
                  Δ{calculation.diffNum}
                </span>
              </div>
            </div>

          </div>

          {/* Direct Numbers Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Direct Combinations:
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {calculation.directs.map((d) => (
                  <span key={d} className="bg-white border border-slate-300 text-slate-900 font-mono font-black text-xs px-2 py-0.5 rounded shadow-2xs">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSharePrediction}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>💬</span>
                <span>Share</span>
              </button>
              <button
                type="button"
                onClick={handleCopyPrediction}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer active:scale-95"
              >
                {copied ? 'Copied! ✓' : '📋 Copy'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-rose-500 font-bold text-center py-2">
          Please enter valid numbers between 00 and 99.
        </p>
      )}

    </div>
  );
}
