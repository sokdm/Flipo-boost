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

// Install Chrome locally if not present
const installChrome = async () => {
  const localCache = path.join(__dirname, '..', '.cache', 'puppeteer');
  
  try {
    if (!fs.existsSync(localCache)) {
      fs.mkdirSync(localCache, { recursive: true });
    }
    
    // Check if Chrome already exists
    const chromeDirs = fs.readdirSync(localCache).filter(d => d.startsWith('chrome-'));
    if (chromeDirs.length > 0) {
      console.log('✅ Chrome already installed locally');
      return true;
    }
    
    console.log('🌐 Installing Chrome locally...');
    process.env.PUPPETEER_CACHE_DIR = localCache;
    execSync('npx puppeteer browsers install chrome', { 
      cwd: __dirname,
      stdio: 'inherit',
      timeout: 180000,
      env: { ...process.env, PUPPETEER_CACHE_DIR: localCache }
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
  // Try to install Chrome
  await installChrome();
  
  // Initialize browser manager with local path
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
