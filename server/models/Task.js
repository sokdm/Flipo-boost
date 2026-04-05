const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['tiktok', 'youtube', 'facebook', 'instagram', 'linkedin', 'x', 'twitter']
  },
  service: {
    type: String,
    required: true,
    enum: ['followers', 'likes', 'comments', 'views', 'shares', 'subscribers']
  },
  targetUrl: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 10000
  },
  completed: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'paused'],
    default: 'pending'
  },
  progress: {
    type: Number,
    default: 0
  },
  logs: [{
    message: String,
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['info', 'success', 'error', 'warning'] }
  }],
  settings: {
    speed: { type: String, default: 'medium' }, // slow, medium, fast
    proxyEnabled: { type: Boolean, default: false },
    humanBehavior: { type: Boolean, default: true }
  },
  startedAt: Date,
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);
