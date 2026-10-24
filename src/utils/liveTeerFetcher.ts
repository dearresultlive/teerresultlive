// Browser & Cloudflare Worker compatible live Teer result fetcher

export const GAS_SCRAPER_URL = 'https://script.google.com/macros/s/AKfycbwmWnd4UFGtupP0c_pi1wAUZ1VRifXuor3hG6WUFym2MZ2aaoPBbk4mrm47eAglgKA/exec';

export function cleanNumber(val: any): string {
  if (!val || val === '—' || val === '-' || val === 'xx' || val === '??') return 'xx';
  const match = String(val).trim().match(/\b(\d{1,2})\b/);
  if (!match) return 'xx';
  return match[1].padStart(2, '0');
}

// Source 1: Google Apps Script Web App (Hosted on Google datacenter, immune to Cloudflare bot blocks)
export async function fetchFromGoogleAppsScript(): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(GAS_SCRAPER_URL, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: any = await res.json();
      if (data && data.games) {
        return data;
      }
    }
  } catch (err: any) {
    // console.warn('GAS fetch skipped:', err.message);
  }
  return null;
}

// Source 2: Direct CDN API for Shillong Teer
export async function fetchShillongCDN(): Promise<{ date: string; fr: string; sr: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://cdn.shillongteerground.com/teer/api/results/latest/index.json', {
      signal: controller.signal,
      headers: {
        'Referer': 'https://shillongteerground.com/',
        'Origin': 'https://shillongteerground.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data: any = await res.json();
      return {
        date: data.date,
        fr: cleanNumber(data.first_round),
        sr: cleanNumber(data.second_round)
      };
    }
  } catch (err: any) {
    // console.warn('CDN fetch skipped:', err.message);
  }
  return null;
}

// Source 3: Multi-Game Aggregator for Shillong, Khanapara, Juwai, and Night Teer
export async function fetchAggregatorData(): Promise<Record<string, { fr: string; sr: string; isOffDay?: boolean }> | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://teerresult.com', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();

    const games = ['shillong', 'khanapara', 'juwai', 'night'];
    const extracted: Record<string, { fr: string; sr: string; isOffDay?: boolean }> = {};

    for (const g of games) {
      const reg = new RegExp('\\\\"id\\\\":\\\\"(' + g + ')\\\\"[\\s\\S]*?\\\\"current_date\\\\":\\\\"([^\\\\]+)\\\\"[\\s\\S]*?\\\\"is_off_day\\\\":(true|false)[\\s\\S]*?\\\\"today\\\\":(null|\\{[^\\}]+\\})[\\s\\S]*?\\\\"previous\\\\":(\\{[^\\}]+\\})');
      const m = text.match(reg);
      if (m) {
        const isOffDay = m[3] === 'true';
        const todayStr = m[4].replace(/\\"/g, '"');
        const today = todayStr === 'null' ? null : JSON.parse(todayStr);

        if (today) {
          extracted[g] = {
            fr: cleanNumber(today.first_round),
            sr: cleanNumber(today.second_round),
            isOffDay
          };
        }
      }
    }

    // Fallback ticker regex
    if (Object.keys(extracted).length === 0) {
      const tickerMapping = [
        { key: 'shillong', label: 'Shillong Teer' },
        { key: 'khanapara', label: 'Khanapara Teer' },
        { key: 'juwai', label: 'Juwai Teer' },
        { key: 'night', label: 'Night Teer' }
      ];

      for (const item of tickerMapping) {
        const reg = new RegExp('>' + item.label + '<\\/span>[\\s\\S]*?FR<\\/span>[\\s\\S]*?tabular-nums[^>]*>([^<]*)<\\/span>[\\s\\S]*?SR<\\/span>[\\s\\S]*?tabular-nums[^>]*>([^<]*)<\\/span>', 'i');
        const m = text.match(reg);
        if (m) {
          extracted[item.key] = {
            fr: cleanNumber(m[1]),
            sr: cleanNumber(m[2])
          };
        }
      }
    }

    return extracted;
  } catch (err: any) {
    // console.warn('Aggregator fetch skipped:', err.message);
    return null;
  }
}
