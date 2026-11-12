require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');

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
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, message: 'Smart Monitor successfully linked to Telegram!', user: updatedUser });
  } catch (error) {
    console.error('Error linking chat:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Smart Monitor backend running on port ${PORT}`);
});