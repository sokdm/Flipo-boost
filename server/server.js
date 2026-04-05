const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production'
  });
});

const connectDB = async (retries = 5) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB Atlas Connected');
  } catch (error) {
    console.error(`❌ MongoDB Connection Error (retries left: ${retries}):`, error.message);
    if (retries > 0) {
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      console.error('Max retries reached. Exiting...');
      process.exit(1);
    }
  }
};

// Install Chrome if disk is available
const installChrome = async () => {
  const cacheDir = '/opt/render/.cache/puppeteer';
  
  // Check if disk is mounted
  if (!fs.existsSync('/opt/render/.cache')) {
    console.log('⚠️ Disk not mounted at /opt/render/.cache - Chrome cannot be installed');
    return false;
  }
  
  try {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    console.log('🌐 Installing Chrome for Puppeteer...');
    execSync('cd server && npx puppeteer browsers install chrome', { 
      stdio: 'inherit',
      timeout: 120000 
    });
    console.log('✅ Chrome installed successfully');
    return true;
  } catch (error) {
    console.log('⚠️ Chrome install failed:', error.message);
    return false;
  }
};

// Initialize browser manager
const browserManager = require('./services/automation/browserManager');

const startServer = async () => {
  // Check disk and install Chrome
  const chromeInstalled = await installChrome();
  
  // Initialize browser manager
  await browserManager.initialize();
  if (browserManager.isAvailable()) {
    console.log('✅ Browser automation ready');
  } else {
    console.log('⚠️ Browser automation not available');
  }

  // API Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/tasks', require('./routes/tasks'));
  app.use('/api/user', require('./routes/user'));
  app.use('/api/platforms', require('./routes/platforms'));

  // Serve static files
  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../client/dist');
    
    if (fs.existsSync(clientDist)) {
      console.log('📁 Serving static files from:', clientDist);
      app.use(express.static(clientDist));
      
      app.get('*', (req, res) => {
        const indexPath = path.join(clientDist, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).json({ error: 'Frontend not built' });
        }
      });
    } else {
      console.error('❌ Client dist folder not found');
      app.get('/', (req, res) => {
        res.json({ error: 'Frontend not built' });
      });
    }
  }

  app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
  });

  const PORT = process.env.PORT || 10000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
};

connectDB().then(startServer);
