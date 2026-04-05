const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

router.get('/credits', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('credits');
    res.json({ credits: user.credits });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
});

module.exports = router;
