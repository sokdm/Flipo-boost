const express = require('express');
const router = express.Router();
const BotAccount = require('../models/BotAccount');

// Add bot account
router.post('/add', async (req, res) => {
  try {
    const { platform, username, password, email } = req.body;
    
    if (!platform || !username || !password) {
      return res.status(400).json({ error: 'Platform, username, and password required' });
    }

    // Check if bot already exists
    const existing = await BotAccount.findOne({ platform, username });
    if (existing) {
      return res.status(400).json({ error: 'Bot already exists' });
    }

    const bot = new BotAccount({
      platform,
      username,
      password,
      email,
      status: 'active'
    });

    await bot.save();
    
    res.json({ 
      success: true, 
      message: 'Bot added to pool',
      bot: {
        id: bot._id,
        platform: bot.platform,
        username: bot.username,
        status: bot.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all bots
router.get('/list', async (req, res) => {
  try {
    const bots = await BotAccount.find().select('-password').sort({ createdAt: -1 });
    res.json(bots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pool stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await BotAccount.aggregate([
      {
        $group: {
          _id: { platform: '$platform', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format stats
    const formatted = {};
    stats.forEach(stat => {
      if (!formatted[stat._id.platform]) {
        formatted[stat._id.platform] = {};
      }
      formatted[stat._id.platform][stat._id.status] = stat.count;
    });
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset bot status
router.post('/reset/:botId', async (req, res) => {
  try {
    const bot = await BotAccount.findByIdAndUpdate(req.params.botId, {
      status: 'active',
      errorCount: 0,
      lastError: null,
      dailyActions: {}
    }, { new: true }).select('-password');
    
    res.json({ success: true, bot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete bot
router.delete('/:botId', async (req, res) => {
  try {
    await BotAccount.findByIdAndDelete(req.params.botId);
    res.json({ success: true, message: 'Bot deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
