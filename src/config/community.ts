// Centralized community channels configuration
// Override via Cloudflare Pages environment variables or update directly here

export const COMMUNITY_LINKS = {
  // Official Facebook Page URL
  facebook: import.meta.env.PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/1386286871244175',

  // Official Telegram Channel URL
  telegram: import.meta.env.PUBLIC_TELEGRAM_URL || 'https://t.me/teerresultlive_in',

  // Official WhatsApp Channel URL
  whatsappChannel: import.meta.env.PUBLIC_WHATSAPP_CHANNEL_URL || 'https://whatsapp.com/channel/0029Vb9M4Ba90x2pwejTOF3r'
};
