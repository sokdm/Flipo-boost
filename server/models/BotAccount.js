const mongoose = require('mongoose');

const botAccountSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true,
    enum: ['tiktok', 'instagram', 'twitter', 'x', 'youtube']
  },
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  // Session cookies (auto-saved after login)
  cookies: [{
    name: String,
    value: String,
    domain: String,
    path: String,
    expires: Number,
    httpOnly: Boolean,
    secure: Boolean,
    sameSite: String
  }],
  // Account status
  status: {
    type: String,
    enum: ['active', 'suspended', 'blocked', 'rate_limited', 'needs_verification', 'error'],
    default: 'active'
  },
  // Usage tracking
  dailyActions: {
    type: Map,
    of: Number,
    default: {}
  },
  totalActions: {
    type: Number,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: null
  },
  lastError: {
    type: String,
    default: null
  },
  errorCount: {
    type: Number,
    default: 0
  },
  // Proxy assignment
  assignedProxy: {
    type: String,
    default: null
  },
  // Platform-specific IDs
  platformUserId: {
    type: String,
    default: null
  },
  // Creation date
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast queries
botAccountSchema.index({ platform: 1, status: 1 });
botAccountSchema.index({ lastUsed: 1 });

module.exports = mongoose.model('BotAccount', botAccountSchema);
