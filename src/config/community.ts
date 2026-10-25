// Centralized community channels configuration
// Override via Cloudflare Pages environment variables or update directly here

export const COMMUNITY_LINKS = {
  // Official Telegram Channel URL
  telegram: import.meta.env.PUBLIC_TELEGRAM_URL || 'https://t.me/teerresultlive_official',

  // Official WhatsApp Channel URL
  whatsappChannel: import.meta.env.PUBLIC_WHATSAPP_CHANNEL_URL || 'https://whatsapp.com/channel/0029VaTeerResultLive'
};
