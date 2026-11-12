const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    deviceId: { type: String, required: true, unique: true },
    chatId: { type: String, required: true },
    lastSeen: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);