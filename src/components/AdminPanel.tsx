import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Save, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Share2, Eye, EyeOff } from 'lucide-react';

interface GameData {
  name: string;
  location?: string;
  fr: string;
  sr: string;
  status: string;
  fr_time: string;
  sr_time: string;
  locked?: boolean;
}

const GAME_META: Record<string, { name: string; frTime: string; srTime: string; location: string }> = {
  juwai_morning: { name: 'Juwai Morning Teer', frTime: '10:30 AM', srTime: '11:30 AM', location: 'Jowai Archery Ground' },
  juwai: { name: 'Juwai Teer', frTime: '1:45 PM', srTime: '2:30 PM', location: 'Juwai Traditional Ground' },
  shillong: { name: 'Shillong Teer', frTime: '3:45 PM', srTime: '4:45 PM', location: 'Polo Ground, East Khasi Hills' },
  khanapara: { name: 'Khanapara Teer', frTime: '4:00 PM', srTime: '4:30 PM', location: 'Khanapara (Assam-Meghalaya Border)' },
  night: { name: 'Shillong Night Teer', frTime: '10:30 PM', srTime: '11:30 PM', location: 'Shillong Club Night Ground' }
};

export default function AdminPanel() {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [games, setGames] = useState<Record<string, GameData>>({});
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMessage, setActiveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit states for each game
  const [editForms, setEditForms] = useState<Record<string, {
    fr: string;
    sr: string;
    status: string;
    locked: boolean;
    broadcastFacebook: boolean;
    broadcastTelegram: boolean;
    isUpdating: boolean;
  }>>({});

  // Restore saved PIN from local storage
  useEffect(() => {
    const savedPin = localStorage.getItem('teer_admin_pin');
    if (savedPin) {
      setPin(savedPin);
    }
    loadLiveData();
  }, []);

  async function loadLiveData() {
    setLoading(true);
    try {
      const res = await fetch('/api/teer/latest?refresh=1&_t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        setDate(data.date || '');
        setGames(data.games || {});

        const initialForms: any = {};
        for (const [key, g] of Object.entries<any>(data.games || {})) {
          initialForms[key] = {
            fr: g.fr || 'xx',
            sr: g.sr || 'xx',
            status: g.status || 'UPCOMING',
            locked: !!g.locked,
            broadcastFacebook: true,
            broadcastTelegram: false,
            isUpdating: false
          };
        }
        setEditForms(initialForms);
      }
    } catch {
      setActiveMessage({ type: 'error', text: 'Failed to load live teer results from server.' });
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) {
      setAuthError('Please enter admin PIN.');
      return;
    }
    localStorage.setItem('teer_admin_pin', pin.trim());
    setIsAuthenticated(true);
    setAuthError('');
  }

  function handleFormChange(gameKey: string, field: string, value: any) {
    setEditForms((prev) => ({
      ...prev,
      [gameKey]: {
        ...prev[gameKey],
        [field]: value
      }
    }));
  }

  async function saveGameOverride(gameKey: string) {
    const form = editForms[gameKey];
    if (!form) return;

    // Clean inputs: accept 'xx' or 2-digit numbers
    const cleanFR = form.fr.trim().toLowerCase();
    const cleanSR = form.sr.trim().toLowerCase();

    const isValidFR = cleanFR === 'xx' || /^\d{1,2}$/.test(cleanFR);
    const isValidSR = cleanSR === 'xx' || /^\d{1,2}$/.test(cleanSR);

    if (!isValidFR || !isValidSR) {
      setActiveMessage({ type: 'error', text: `${GAME_META[gameKey]?.name || gameKey}: Please enter 2 digits (00-99) or 'xx'.` });
      return;
    }

    const finalFR = cleanFR === 'xx' ? 'xx' : cleanFR.padStart(2, '0');
    const finalSR = cleanSR === 'xx' ? 'xx' : cleanSR.padStart(2, '0');

    handleFormChange(gameKey, 'isUpdating', true);
    setActiveMessage(null);

    try {
      const res = await fetch('/api/admin/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': pin.trim()
        },
        body: JSON.stringify({
          pin: pin.trim(),
          gameKey,
          fr: finalFR,
          sr: finalSR,
          status: form.status,
          locked: form.locked,
          broadcastFacebook: form.broadcastFacebook,
          broadcastTelegram: form.broadcastTelegram
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActiveMessage({
          type: 'success',
          text: `✅ ${GAME_META[gameKey]?.name} updated to [FR: ${finalFR}, SR: ${finalSR}]! ${json.message || ''}`
        });
        await loadLiveData();
      } else {
        setActiveMessage({ type: 'error', text: `❌ Update rejected: ${json.error || 'Invalid credentials or error.'}` });
        if (res.status === 401) {
          setIsAuthenticated(false);
          setAuthError('Invalid Admin PIN.');
        }
      }
    } catch (err: any) {
      setActiveMessage({ type: 'error', text: `Network error: ${err.message}` });
    } finally {
      handleFormChange(gameKey, 'isUpdating', false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-slate-200 shadow-xl text-slate-800">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Admin Control Panel</h1>
            <p className="text-xs text-slate-500">Manual Override & Live Result Manager</p>
          </div>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Enter Admin PIN / Secret Key
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN (e.g. teeradmin789)"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base focus:ring-2 focus:ring-amber-500 focus:outline-none pr-11 font-mono"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Default PIN: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">teeradmin789</code></p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2"
          >
            <Lock className="w-4 h-4" />
            <span>Unlock Admin Panel</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> ADMIN AUTHENTICATED
            </span>
            <span className="text-xs text-slate-500 font-mono">Date: {date}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Teer Live Override Console</h1>
          <p className="text-xs text-slate-500">
            Override any incorrect bot numbers immediately. Locked games are immune to auto-poller overwrites.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-stretch sm:self-auto">
          <button
            onClick={loadLiveData}
            disabled={loading}
            className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Data</span>
          </button>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              localStorage.removeItem('teer_admin_pin');
            }}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Global Toast Alert */}
      {activeMessage && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 shadow-sm ${
          activeMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {activeMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold">{activeMessage.text}</span>
        </div>
      )}

      {/* Game Override Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(GAME_META).map(([gameKey, meta]) => {
          const liveGame = games[gameKey];
          const form = editForms[gameKey] || {
            fr: liveGame?.fr || 'xx',
            sr: liveGame?.sr || 'xx',
            status: liveGame?.status || 'UPCOMING',
            locked: false,
            broadcastFacebook: true,
            broadcastTelegram: false,
            isUpdating: false
          };

          const isDeclared = liveGame?.status === 'DECLARED';
          const isFrDeclared = liveGame?.status === 'FR DECLARED';

          return (
            <div
              key={gameKey}
              className={`bg-white rounded-2xl p-5 border shadow-sm transition ${
                form.locked ? 'border-amber-400 ring-2 ring-amber-100' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-black text-slate-900">{meta.name}</h2>
                    {form.locked && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white uppercase tracking-wider">
                        <Lock className="w-2.5 h-2.5 mr-0.5" /> LOCKED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{meta.location}</p>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black ${
                    isDeclared
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : (isFrDeclared ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-600')
                  }`}>
                    {liveGame?.status || 'UPCOMING'}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Live: {liveGame?.fr || 'xx'} | {liveGame?.sr || 'xx'}
                  </p>
                </div>
              </div>

              {/* Edit Controls */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      1st Round ({meta.frTime})
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={form.fr}
                      onChange={(e) => handleFormChange(gameKey, 'fr', e.target.value)}
                      placeholder="xx"
                      className="w-full text-center py-2.5 text-2xl font-black bg-white border border-slate-300 rounded-lg text-slate-900 font-mono tracking-wider focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      2nd Round ({meta.srTime})
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={form.sr}
                      onChange={(e) => handleFormChange(gameKey, 'sr', e.target.value)}
                      placeholder="xx"
                      className="w-full text-center py-2.5 text-2xl font-black bg-white border border-slate-300 rounded-lg text-slate-900 font-mono tracking-wider focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Status Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Display Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => handleFormChange(gameKey, 'status', e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="UPCOMING">UPCOMING (Draw Pending)</option>
                    <option value="FR DECLARED">FR DECLARED (1st Round Ready)</option>
                    <option value="DECLARED">DECLARED (Both Rounds Final)</option>
                    <option value="SUNDAY OFF">SUNDAY OFF / HOLIDAY</option>
                  </select>
                </div>

                {/* Lock & Broadcast Toggles */}
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.locked}
                      onChange={(e) => handleFormChange(gameKey, 'locked', e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-slate-800 flex items-center">
                      <Lock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Lock Manual Override (Prevent bot overwrite)
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.broadcastFacebook}
                      onChange={(e) => handleFormChange(gameKey, 'broadcastFacebook', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-slate-700 flex items-center">
                      <Share2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      Post graphic card to Facebook Page immediately
                    </span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.broadcastTelegram}
                      onChange={(e) => handleFormChange(gameKey, 'broadcastTelegram', e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Broadcast update to Telegram Channel
                    </span>
                  </label>
                </div>

                {/* Save Button */}
                <button
                  type="button"
                  disabled={form.isUpdating}
                  onClick={() => saveGameOverride(gameKey)}
                  className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-xs font-bold rounded-lg shadow transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{form.isUpdating ? 'Publishing Changes...' : `Update & Publish ${meta.name}`}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
