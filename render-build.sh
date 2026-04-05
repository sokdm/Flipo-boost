#!/bin/bash

echo "🚀 Starting Filpo Boost Build..."

# Install root deps
echo "📦 Installing root dependencies..."
npm install

# Install server deps (without postinstall)
echo "📦 Installing server dependencies..."
cd server
npm install --ignore-scripts
cd ..

# Install client deps and build
echo "📦 Installing client dependencies..."
cd client
npm install

echo "🔨 Building client..."
npm run build
cd ..

# Try to install Chrome for Puppeteer (will work on Standard tier with disk)
echo "🌐 Checking for Chrome..."
if [ -d "/opt/render/.cache/puppeteer" ]; then
  echo "📁 Puppeteer cache directory exists"
  cd server
  npx puppeteer browsers install chrome || echo "⚠️ Chrome install failed, will retry at runtime"
  cd ..
else
  echo "⚠️ No puppeteer cache dir (expected on first deploy)"
fi

echo "✅ Build complete!"
echo "📁 Checking client/dist..."
ls -la client/dist/ || echo "❌ dist folder not found"
