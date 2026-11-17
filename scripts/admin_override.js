/**
 * Admin CLI Override Tool for Teer Result Live
 * 
 * Usage:
 *   node scripts/admin_override.js <gameKey> <fr> <sr> [--lock] [--fb] [--tg]
 * 
 * Example:
 *   node scripts/admin_override.js juwai_morning 24 93 --lock --fb
 *   node scripts/admin_override.js shillong 19 45 --fb
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { broadcastFacebookTeerResult } from './facebook_publisher.js';
import { broadcastTeerResult } from './telegram_bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, '../src/data/teer_live_results.json');

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log(`
Usage:
  node scripts/admin_override.js <gameKey> <fr> <sr> [--lock] [--fb] [--tg]

Games:
  shillong, khanapara, juwai, juwai_morning, night

Examples:
  node scripts/admin_override.js juwai_morning 24 93 --lock --fb
  node scripts/admin_override.js shillong 19 45 --fb
`);
  process.exit(1);
}

const gameKey = args[0].toLowerCase();
const fr = args[1].toLowerCase().padStart(2, '0');
const sr = args[2].toLowerCase().padStart(2, '0');
const isLocked = args.includes('--lock');
const postFacebook = args.includes('--fb');
const postTelegram = args.includes('--tg');

const raw = fs.readFileSync(DATA_PATH, 'utf8');
const data = JSON.parse(raw);

if (!data.games[gameKey]) {
  console.error(`❌ Unknown game key "${gameKey}". Available: ${Object.keys(data.games).join(', ')}`);
  process.exit(1);
}

const g = data.games[gameKey];
g.fr = fr;
g.sr = sr;
g.status = (fr !== 'xx' && sr !== 'xx') ? 'DECLARED' : (fr !== 'xx' ? 'FR DECLARED' : 'UPCOMING');
g.locked = isLocked;
g.manual_override = true;
g.fr_verification = 'VERIFIED';
g.sr_verification = 'VERIFIED';
g.fr_sources = ['admin_cli_override'];
g.sr_sources = ['admin_cli_override'];
data.updated_at = new Date().toISOString();

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Successfully updated ${g.name} (${gameKey}) -> FR: ${fr}, SR: ${sr} [Status: ${g.status}, Locked: ${isLocked}]`);

if (postFacebook && (fr !== 'xx' || sr !== 'xx')) {
  console.log('📢 Publishing to Facebook Page...');
  broadcastFacebookTeerResult({
    gameKey,
    date: data.date,
    fr,
    sr,
    frTime: g.fr_time,
    srTime: g.sr_time,
    roundType: (fr !== 'xx' && sr !== 'xx') ? 'FULL' : 'FR_ONLY'
  }).then(ok => console.log('Facebook published:', ok));
}

if (postTelegram && (fr !== 'xx' || sr !== 'xx')) {
  console.log('📢 Broadcasting to Telegram Channel...');
  broadcastTeerResult({
    gameKey,
    date: data.date,
    fr,
    sr,
    frTime: g.fr_time,
    srTime: g.sr_time,
    roundType: (fr !== 'xx' && sr !== 'xx') ? 'FULL' : 'FR_ONLY'
  }).then(ok => console.log('Telegram broadcasted:', ok));
}
