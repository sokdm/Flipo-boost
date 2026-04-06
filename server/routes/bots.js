const express = require('express');
const router = express.Router();
const BotAccount = require('../models/BotAccount');
const botPoolManager = require('../services/automation/botPoolManager');
const { auth, adminAuth } = require('../middleware/auth');

// Get bot pool stats (admin only)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const stats = await botPoolManager.getPoolStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new bot account (admin only)
router.post('/add', adminAuth, async (req, res) => {
  try {
    const { platform, username, password, email } = req.body;
    
    if (!platform || !username || !password) {
      return res.status(400).json({ error: 'Platform, username, and password required' });
    }

    const bot = await botPoolManager.addBot(platform, username, password, email);
    res.json({ success: true, bot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all bots (admin only)
router.get('/list', adminAuth, async (req, res) => {
  try {
    const bots = await BotAccount.find().select('-password').sort({ createdAt: -1 });
    res.json(bots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset bot status (admin only)
router.post('/reset/:botId', adminAuth, async (req, res) => {
  try {
    const bot = await BotAccount.findByIdAndUpdate(req.params.botId, {
      status: 'active',
      errorCount: 0,
      lastError: null,
      dailyActions: {}
    }, { new: true });
    
    res.json({ success: true, bot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete bot (admin only)
router.delete('/:botId', adminAuth, async (req, res) => {
  try {
    await BotAccount.findByIdAndDelete(req.params.botId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
