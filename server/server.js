const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

// CORS - Allow all origins in production (fix for Render)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10mb' }));
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production',
    chrome: fs.existsSync('/opt/render/project/src/.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux64/chrome')
  });
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working', time: new Date().toISOString() });
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

// Check if Chrome exists
const chromeExists = () => {
  const cacheDir = process.env.PUPPETEER_CACHE_DIR || '/opt/render/project/src/.cache/puppeteer';
  if (!fs.existsSync(cacheDir)) return false;
  
  try {
    const dirs = fs.readdirSync(cacheDir).filter(d => d.startsWith('chrome-'));
    return dirs.length > 0;
  } catch (e) {
    return false;
  }
};

// Install Chrome asynchronously
const installChrome = () => {
  return new Promise((resolve) => {
    if (chromeExists()) {
      console.log('✅ Chrome already installed');
      resolve(true);
      return;
    }

    const cacheDir = process.env.PUPPETEER_CACHE_DIR || '/opt/render/project/src/.cache/puppeteer';
    console.log('🌐 Starting Chrome installation...');
    
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
    } catch (e) {}

    const installProcess = spawn('npx', ['puppeteer', 'browsers', 'install', 'chrome'], {
      cwd: path.join(__dirname),
      env: { ...process.env, PUPPETEER_CACHE_DIR: cacheDir },
      detached: true
    });

    let output = '';
    installProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log('Chrome install:', data.toString().trim());
    });

    installProcess.stderr.on('data', (data) => {
      console.error('Chrome install error:', data.toString().trim());
    });

    installProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Chrome installation completed');
        resolve(true);
      } else {
        console.log('⚠️ Chrome installation failed with code:', code);
        resolve(false);
      }
    });

    setTimeout(() => {
      console.log('⏱️ Chrome install timeout - continuing');
      resolve(false);
    }, 300000);
  });
};

// Initialize browser manager
const browserManager = require('./services/automation/browserManager');

const startServer = async () => {
  const PORT = process.env.PORT || 10000;
  
  // API Routes - MUST be before static files
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/tasks', require('./routes/tasks'));
  app.use('/api/user', require('./routes/user'));
  app.use('/api/platforms', require('./routes/platforms'));

  // Serve static files LAST
  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../client/dist');
    
    if (fs.existsSync(clientDist)) {
      console.log('📁 Serving static files from:', clientDist);
      app.use(express.static(clientDist));
      
      // This catch-all must be AFTER API routes
      app.get('*', (req, res) => {
        // Don't serve index.html for API routes
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        const indexPath = path.join(clientDist, 'index.html');
        res.sendFile(indexPath);
      });
    }
  }

  app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });

  // Install Chrome in background
  setTimeout(async () => {
    await installChrome();
    await browserManager.initialize();
    if (browserManager.isAvailable()) {
      console.log('✅ Browser automation ready');
    } else {
      console.log('⚠️ Browser automation not available');
    }
  }, 1000);
};

connectDB().then(startServer);
