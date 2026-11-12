require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const User = require('./models/User');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error("ERROR: TELEGRAM_BOT_TOKEN is missing in environment variables!");
    process.exit(1);
}

// Initialize bot with robust polling options to prevent network crashes
const bot = new TelegramBot(token, { 
    polling: {
        interval: 2000,       // Poll every 2 seconds to avoid rate limits
        autoStart: true,
        params: {
            timeout: 10
        }
    } 
});

// CRITICAL FIX: Clear any stuck webhooks on startup to resolve 409 Conflict errors
bot.deleteWebHook().then(() => {
    console.log("Telegram webhook cleared successfully. Polling is active.");
}).catch((err) => {
    console.error("Webhook clearance notice:", err.message);
});

// Gracefully handle polling errors so the server doesn't crash on network flickers
bot.on('polling_error', (error) => {
    if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
        console.warn("Polling conflict detected: Another instance is running. Make sure local scripts are closed.");
    } else {
        console.error(`Telegram Polling Notice [${error.code || 'UNKNOWN'}]: ${error.message}`);
    }
});

console.log('Smart Monitor Telegram Bot is running and listening for commands...');

// 1. /start Command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🤖 **Welcome to Smart Monitor!**

Your Telegram Chat ID is: \`${chatId}\`

**How to link your phone:**
1. Open the Smart Monitor app on your Android phone.
2. Enter this Chat ID into the setup screen and hit **Connect**.
3. Once linked, you can use commands like:
   - /device (Hardware, Battery & Storage stats)
   - /contacts (Export phonebook vcf/txt)
   - /location (Get live GPS pin)
   - /clipboard (Sync active clipboard)
   - /screenshot (Capture current screen)
   - /apps (List installed apps)
   - /lock (Lock device remotely)
   - /ip (Check network info)
  `;
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// 2. Command Router Helper (Finds device linked to this Telegram chat)
async function getDeviceForChat(chatId) {
  return await User.findOne({ chatId: chatId.toString() });
}

// 3. /device Command
bot.onText(/\/device/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getDeviceForChat(chatId);
  if (!user) return bot.sendMessage(chatId, '⚠️ Error: No Android device is linked to this Telegram chat ID yet. Open your Smart Monitor app and link your device first.');

  bot.sendMessage(chatId, `🔍 Requesting device metrics from Device ID: \`${user.deviceId}\`...`, { parse_mode: 'Markdown' });
});

// 4. /contacts Command
bot.onText(/\/contacts/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getDeviceForChat(chatId);
  if (!user) return bot.sendMessage(chatId, '⚠️ Device not linked.');

  bot.sendMessage(chatId, '📇 Fetching phone contacts list...');
});

// 5. /location Command
bot.onText(/\/location/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getDeviceForChat(chatId);
  if (!user) return bot.sendMessage(chatId, '⚠️ Device not linked.');

  bot.sendMessage(chatId, '📍 Requesting live GPS coordinates...');
});

// 6. /clipboard Command
bot.onText(/\/clipboard/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getDeviceForChat(chatId);
  if (!user) return bot.sendMessage(chatId, '⚠️ Device not linked.');

  bot.sendMessage(chatId, '📋 Fetching active device clipboard...');
});

// 7. /screenshot Command
bot.onText(/\/screenshot/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getDeviceForChat(chatId);
  if (!user) return bot.sendMessage(chatId, '⚠️ Device not linked.');

  bot.sendMessage(chatId, '📸 Capturing screen snapshot...');
});

// 8. /apps Command
bot.onText(/\/apps/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getDeviceForChat(chatId);
  if (!user) return bot.sendMessage(chatId, '⚠️ Device not linked.');

  bot.sendMessage(chatId, '📱 Compiling installed apps list...');
});

// 9. /lock Command
bot.onText(/\/lock/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getDeviceForChat(chatId);
  if (!user) return bot.sendMessage(chatId, '⚠️ Device not linked.');

  bot.sendMessage(chatId, '🔒 Sending remote lock command to device...');
});

// 10. /ip Command
bot.onText(/\/ip/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getDeviceForChat(chatId);
  if (!user) return bot.sendMessage(chatId, '⚠️ Device not linked.');

  bot.sendMessage(chatId, '🌐 Fetching local Wi-Fi and public IP details...');
});

module.exports = bot;