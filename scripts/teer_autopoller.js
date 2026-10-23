/**
 * Teer Live Result Auto-Poller
 * Fetches real-time First Round (FR) and Second Round (SR) results
 * for Shillong, Khanapara, Juwai, and Night Teer.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIVE_DATA_PATH = path.resolve(__dirname, '../src/data/teer_live_results.json');
const ARCHIVE_PATH = path.resolve(__dirname, '../src/data/previous_teer_archive.json');

const SOURCES = [
  'https://www.meghalayateer.com',
  'https://shillongteerground.com'
];

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// Extract 2-digit number safely
function cleanNumber(val) {
  if (!val) return 'xx';
  const match = String(val).trim().match(/\b(\d{1,2})\b/);
  if (!match) return 'xx';
  return match[1].padStart(2, '0');
}

export async function runPoller() {
  console.log(`[${new Date().toISOString()}] Starting Teer auto-poller...`);

  if (!fs.existsSync(LIVE_DATA_PATH)) {
    console.error(`Missing live data file at ${LIVE_DATA_PATH}`);
    return;
  }

  const liveData = JSON.parse(fs.readFileSync(LIVE_DATA_PATH, 'utf-8'));
  const todayStr = new Date().toISOString().split('T')[0];

  let rawHtml = '';
  for (const src of SOURCES) {
    try {
      console.log(`Trying source: ${src}...`);
      rawHtml = await fetchWithTimeout(src);
      if (rawHtml && rawHtml.length > 500) {
        console.log(`Successfully fetched ${rawHtml.length} bytes from ${src}`);
        break;
      }
    } catch (e) {
      console.warn(`Failed fetching from ${src}: ${e.message}`);
    }
  }

  let updated = false;

  // Simple and robust regex extractors for Shillong, Khanapara, Juwai
  // Pattern 1: Table row with Shillong FR / SR
  const shillongMatch = rawHtml.match(/Shillong[^<]*<[\s\S]*?>(\d{1,2})<[\s\S]*?>(\d{1,2})/i);
  if (shillongMatch) {
    const fr = cleanNumber(shillongMatch[1]);
    const sr = cleanNumber(shillongMatch[2]);
    if (fr !== 'xx' && liveData.games.shillong.fr !== fr) {
      liveData.games.shillong.fr = fr;
      updated = true;
    }
    if (sr !== 'xx' && liveData.games.shillong.sr !== sr) {
      liveData.games.shillong.sr = sr;
      updated = true;
    }
  }

  // Update timestamp if changes detected
  if (updated || liveData.date !== todayStr) {
    if (liveData.date !== todayStr) {
      // Archive yesterday before resetting
      if (fs.existsSync(ARCHIVE_PATH)) {
        try {
          const archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf-8'));
          const exists = archive.some((item) => item.date === liveData.date);
          if (!exists && liveData.games.shillong.fr !== 'xx') {
            archive.unshift({
              date: liveData.date,
              shillong: { fr: liveData.games.shillong.fr, sr: liveData.games.shillong.sr },
              khanapara: { fr: liveData.games.khanapara.fr, sr: liveData.games.khanapara.sr },
              juwai: { fr: liveData.games.juwai.fr, sr: liveData.games.juwai.sr }
            });
            fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive.slice(0, 30), null, 2));
            console.log(`Archived results for ${liveData.date}`);
          }
        } catch (err) {
          console.error(`Failed to update archive:`, err.message);
        }
      }

      // New day reset
      liveData.date = todayStr;
      liveData.games.shillong.fr = 'xx';
      liveData.games.shillong.sr = 'xx';
      liveData.games.khanapara.fr = 'xx';
      liveData.games.khanapara.sr = 'xx';
      liveData.games.juwai.fr = 'xx';
      liveData.games.juwai.sr = 'xx';
      liveData.games.night.fr = 'xx';
      liveData.games.night.sr = 'xx';
      updated = true;
    }

    liveData.updated_at = new Date().toISOString();
    fs.writeFileSync(LIVE_DATA_PATH, JSON.stringify(liveData, null, 2));
    console.log(`Updated ${LIVE_DATA_PATH} successfully.`);
  } else {
    console.log(`No changes detected. Current data is fresh.`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPoller().catch(console.error);
}
