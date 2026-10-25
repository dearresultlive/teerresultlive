/**
 * Test Telegram Broadcaster Script
 * Usage: node scripts/test_telegram.js <BOT_TOKEN> [@channel_id]
 */

import { sendTelegramMessage } from './telegram_bot.js';

const token = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN;
const channel = process.argv[3] || process.env.TELEGRAM_CHANNEL_ID || '@teerresultlive_in';

if (token) {
  process.env.TELEGRAM_BOT_TOKEN = token;
}
if (channel) {
  process.env.TELEGRAM_CHANNEL_ID = channel;
}

const testMessage = `🎯 <b>TEER RESULT LIVE - BOT TEST</b> 🎯\n\n` +
  `⚡ Your automated Telegram broadcast system is <b>CONNECTED & LIVE</b>!\n\n` +
  `Daily winning numbers for Shillong, Khanapara, Juwai, and Night Teer will now post automatically.\n\n` +
  `🌐 Official Portal: <a href="https://teerresultlive.in/">https://teerresultlive.in/</a>`;

console.log(`Sending test notification to ${channel}...`);
sendTelegramMessage(testMessage).then((success) => {
  if (success) {
    console.log('✅ Test message successfully delivered to Telegram channel!');
    process.exit(0);
  } else {
    console.error('❌ Failed to deliver test message. Check bot permissions and token.');
    process.exit(1);
  }
});
