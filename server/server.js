const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Trust proxy (required for Render)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production'
  });
});

// Database connection
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

// Initialize browser manager (don't block startup)
const browserManager = require('./services/automation/browserManager');
browserManager.initialize().then(() => {
  if (browserManager.isAvailable()) {
    console.log('✅ Browser automation ready');
  } else {
    console.log('⚠️ Browser automation not available - upgrade to Standard tier for full features');
  }
}).catch(err => {
  console.log('⚠️ Browser initialization failed:', err.message);
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/user', require('./routes/user'));
app.use('/api/platforms', require('./routes/platforms'));

// Serve static files in production
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
        res.status(404).json({ error: 'Frontend not built. index.html not found.' });
      }
    });
  } else {
    console.error('❌ Client dist folder not found at:', clientDist);
    app.get('/', (req, res) => {
      res.json({ 
        error: 'Frontend not built', 
        message: 'Client dist folder missing. Build may have failed.',
        distPath: clientDist
      });
    });
  }
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

const PORT = process.env.PORT || 10000;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
});
