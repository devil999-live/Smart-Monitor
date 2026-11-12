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

// API Endpoint: Register or Update User Chat ID from the App
app.post('/api/link-chat', async (req, res) => {
  try {
    const { deviceId, chatId } = req.body;
    
    if (!deviceId || !chatId) {
      return res.status(400).json({ success: false, error: 'Device ID and Chat ID are required.' });
    }

    // Upsert: Update if deviceId exists, or create new record if it doesn't
    const updatedUser = await User.findOneAndUpdate(
      { deviceId },
      { chatId },
      { upsert: true, returnDocument: 'after' }
    );

    res.status(200).json({ success: true, message: 'Smart Monitor successfully linked to Telegram!', user: updatedUser });
  } catch (error) {
    console.error('Error linking chat:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// API Endpoint: Android App polls for pending commands
app.get('/api/get-command', (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) return res.status(400).json({ error: 'Missing deviceId' });

  const command = pendingCommands[deviceId] || null;
  if (command) {
    delete pendingCommands[deviceId]; // Clear command after polling so it executes only once
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
      bot.sendMessage(user.chatId, `📱 **Device Report:**\n\n${result}`, { parse_mode: 'Markdown' });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Linked Telegram chat not found for this device' });
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