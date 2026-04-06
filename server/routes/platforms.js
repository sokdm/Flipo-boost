const express = require('express');
const router = express.Router();
const platforms = require('../utils/platforms');
const { auth } = require('../middleware/auth');

router.get('/', (req, res) => {
  const platformList = Object.keys(platforms).map(key => ({
    id: key,
    name: platforms[key].name,
    color: platforms[key].color,
    services: platforms[key].services
  }));

  res.json(platformList);
});

router.get('/:platform/services', (req, res) => {
  const platform = platforms[req.params.platform];
  if (!platform) {
    return res.status(404).json({ error: 'Platform not found' });
  }
  
  res.json(platform.services.map(service => ({
    id: service,
    name: service.charAt(0).toUpperCase() + service.slice(1),
    description: `Get ${service} on ${platform.name}`
  })));
});

module.exports = router;
