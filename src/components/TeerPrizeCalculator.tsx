import React, { useState, useMemo } from 'react';

type BetType = 'fr' | 'sr' | 'forecast' | 'house_ending';

interface PayoutRule {
  type: BetType;
  title: string;
  shortTitle: string;
  multiplier: number;
  ratioLabel: string;
  desc: string;
  badge: string;
}

const PAYOUT_RULES: Record<BetType, PayoutRule> = {
  fr: {
    type: 'fr',
    title: 'First Round (FR) Direct',
    shortTitle: '1st Round (FR)',
    multiplier: 80,
    ratioLabel: '1 : 80',
    desc: 'Correctly predict the exact 2-digit winning number of the 1st Round (3:45 PM).',
    badge: '80x Payout'
  },
  sr: {
    type: 'sr',
    title: 'Second Round (SR) Direct',
    shortTitle: '2nd Round (SR)',
    multiplier: 60,
    ratioLabel: '1 : 60',
    desc: 'Correctly predict the exact 2-digit winning number of the 2nd Round (4:45 PM).',
    badge: '60x Payout'
  },
  forecast: {
    type: 'forecast',
    title: 'Forecast / Jodi (FR + SR Pairing)',
    shortTitle: 'Forecast (Jodi)',
    multiplier: 4000,
    ratioLabel: '1 : 4,000',
    desc: 'Correctly predict both the 1st Round AND 2nd Round winning numbers together.',
    badge: '4,000x Mega Payout'
  },
  house_ending: {
    type: 'house_ending',
    title: 'House or Ending Single Digit',
    shortTitle: 'House / Ending',
    multiplier: 9,
    ratioLabel: '1 : 9',
    desc: 'Predict only the tens place digit (House) or units place digit (Ending).',
    badge: '9x Payout'
  }
};

export default function TeerPrizeCalculator() {
  const [betType, setBetType] = useState<BetType>('fr');
  const [stakeInput, setStakeInput] = useState<string>('10');
  const [copied, setCopied] = useState(false);

  const presets = [10, 20, 50, 100, 200, 500];

  const currentRule = PAYOUT_RULES[betType];

  const calculation = useMemo(() => {
    const stake = parseFloat(stakeInput);
    if (isNaN(stake) || stake <= 0) {
      return { valid: false, stake: 0, payout: 0, netProfit: 0 };
    }
    const payout = stake * currentRule.multiplier;
    const netProfit = payout - stake;
    return { valid: true, stake, payout, netProfit };
  }, [stakeInput, currentRule]);

  const handleShareWhatsApp = () => {
    if (!calculation.valid) return;
    const shareText = `🎯 *SHILLONG TEER PRIZE CALCULATION*\n\n` +
      `▶ *Category:* ${currentRule.title}\n` +
      `▶ *Ticket Stake:* ₹${calculation.stake.toLocaleString('en-IN')}\n` +
      `▶ *Official Rate:* ${currentRule.ratioLabel} (${currentRule.multiplier}x)\n` +
      `🏆 *Winning Prize:* *₹${calculation.payout.toLocaleString('en-IN')}*\n` +
      `💰 *Net Profit:* *₹${calculation.netProfit.toLocaleString('en-IN')}*\n\n` +
      `⚡ Calculate live payouts & check fastest results:\n👉 https://teerresultlive.in`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    if (typeof navigator !== 'undefined' && navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      navigator.share({
        title: 'Teer Prize Calculator',
        text: shareText,
        url: 'https://teerresultlive.in'
      }).catch(() => {
        window.open(url, '_blank');
      });
    } else {
      window.open(url, '_blank');
    }
  };

  const handleCopy = () => {
    if (!calculation.valid || typeof navigator === 'undefined' || !navigator.clipboard) return;
    const text = `Teer Prize Calculation:\n${currentRule.title}: Stake ₹${calculation.stake} -> Prize ₹${calculation.payout.toLocaleString('en-IN')} (Net: +₹${calculation.netProfit.toLocaleString('en-IN')})\nhttps://teerresultlive.in`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="prize-calculator" className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-slate-900 shadow-xs space-y-4">
      
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
            <span>🏆</span>
            <span>Official Teer Prize &amp; Winnings Calculator</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Calculate standard winning payouts based on licensed Shillong &amp; Khanapara counter ratios.
          </p>
        </div>

        <span className="text-[10px] font-black text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full self-start sm:self-auto shadow-2xs">
          KHASA Standard Ratios
        </span>
      </div>

      {/* Bet Type Category Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.keys(PAYOUT_RULES) as BetType[]).map((key) => {
          const rule = PAYOUT_RULES[key];
          const isActive = betType === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setBetType(key)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black block leading-tight">
                  {rule.shortTitle}
                </span>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                    isActive ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {rule.multiplier}x
                </span>
              </div>
              <span className={`text-[10px] block mt-1 ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-500 font-medium'}`}>
                Ratio: {rule.ratioLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Input & Live Results Display Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        
        {/* Left Col: Amount Input & Quick Chips */}
        <div className="md:col-span-6 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1">
              Enter Ticket Stake (₹ Amount)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                min="1"
                max="100000"
                value={stakeInput}
                onChange={(e) => setStakeInput(e.target.value)}
                placeholder="e.g. 10, 50, 100"
                className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-7 pr-3 text-sm font-mono font-black text-slate-900 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Quick Stake Presets:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStakeInput(val.toString())}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer border ${
                    stakeInput === val.toString()
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  ₹{val}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-snug pt-1">
            {currentRule.desc}
          </p>
        </div>

        {/* Right Col: Big Live Payout Box */}
        <div className="md:col-span-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
          
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
              Estimated Total Winning
            </span>
            <span className="text-[10px] font-black bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-2xs">
              {currentRule.badge}
            </span>
          </div>

          {calculation.valid ? (
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                  ₹{calculation.payout.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-500 font-bold">
                  Gross Return
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <span>Net Gain:</span>
                <span className="font-mono font-black text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded">
                  +₹{calculation.netProfit.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-500">
                  (Stake: ₹{calculation.stake.toLocaleString('en-IN')})
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-red-600 font-bold">
              Please enter a valid amount greater than ₹0.
            </div>
          )}

          {/* Action Buttons: WhatsApp Share & Copy */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 px-3 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <span>💬</span>
              <span>Share Winnings</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-1 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs py-2 px-3 rounded-lg transition-all shadow-xs border border-slate-300 cursor-pointer active:scale-95"
            >
              <span>{copied ? '✓' : '📋'}</span>
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* Official Payout Comparison Matrix */}
      <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-700 font-extrabold text-[11px] uppercase tracking-wider">
          <span>Official Meghalaya Teer Payout Table (₹10 Base)</span>
          <span className="text-slate-400 font-normal">Reference Guide</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 font-mono text-[11px]">
          <div className="bg-white border border-slate-200 rounded-lg p-2">
            <span className="text-[10px] text-slate-500 block font-sans font-bold">1st Round (FR)</span>
            <span className="font-black text-slate-900">₹10 $\rightarrow$ ₹800</span>
            <span className="text-[9px] text-slate-400 block font-sans">80:1 ratio</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-2">
            <span className="text-[10px] text-slate-500 block font-sans font-bold">2nd Round (SR)</span>
            <span className="font-black text-slate-900">₹10 $\rightarrow$ ₹600</span>
            <span className="text-[9px] text-slate-400 block font-sans">60:1 ratio</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-2">
            <span className="text-[10px] text-slate-500 block font-sans font-bold">Forecast (Jodi)</span>
            <span className="font-black text-amber-800">₹10 $\rightarrow$ ₹40,000</span>
            <span className="text-[9px] text-slate-400 block font-sans">4,000:1 ratio</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-2">
            <span className="text-[10px] text-slate-500 block font-sans font-bold">House / Ending</span>
            <span className="font-black text-slate-900">₹10 $\rightarrow$ ₹90</span>
            <span className="text-[9px] text-slate-400 block font-sans">9:1 ratio</span>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 leading-tight">
          Disclaimer: Payout ratios represent standard rates authorized by licensed Khasi Hills archery clubs. Rates may vary slightly by individual counter or regional rules. This tool is intended solely for educational computation.
        </p>
      </div>

    </div>
  );
}
