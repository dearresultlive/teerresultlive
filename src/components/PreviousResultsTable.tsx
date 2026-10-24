import React from 'react';
import archive from '../data/previous_teer_archive.json';

export default function PreviousResultsTable() {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-slate-900 shadow-xs space-y-3">
      
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
            <span>📊</span>
            <span>Previous Teer Hit Numbers (অতীত ফলাফল তালিকা)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified First Round (FR) &amp; Second Round (SR) results for the past 10 draws.
          </p>
        </div>

        <a
          href="/previous-results"
          className="text-xs font-black text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
        >
          <span>Full Archive</span>
          <span>➔</span>
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden font-mono">
          <thead className="bg-slate-50 text-slate-700 font-black uppercase tracking-wider text-[11px] border-b border-slate-200">
            <tr>
              <th className="p-2.5 sm:p-3">Date</th>
              <th className="p-2.5 sm:p-3 text-amber-800">Shillong (FR / SR)</th>
              <th className="p-2.5 sm:p-3 text-emerald-800">Khanapara (FR / SR)</th>
              <th className="p-2.5 sm:p-3 text-blue-800">Juwai (FR / SR)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {archive.map((row) => (
              <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-2.5 sm:p-3 font-bold text-slate-500">
                  {row.date.split('-').reverse().join('/')}
                </td>
                <td className="p-2.5 sm:p-3 font-black text-amber-700">
                  {row.shillong_fr} / {row.shillong_sr}
                </td>
                <td className="p-2.5 sm:p-3 font-black text-emerald-700">
                  {row.khanapara_fr} / {row.khanapara_sr}
                </td>
                <td className="p-2.5 sm:p-3 font-black text-blue-700">
                  {row.juwai_fr} / {row.juwai_sr}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
