#!/bin/bash

echo "🚀 Starting Filpo Boost Build..."

# Use absolute path for cache
export PUPPETEER_CACHE_DIR=/opt/render/project/src/.cache/puppeteer

# Install root deps
echo "📦 Installing root dependencies..."
npm install

# Install server deps
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

# Install Chrome with absolute path
echo "🌐 Installing Chrome..."
mkdir -p $PUPPETEER_CACHE_DIR
cd server
npx puppeteer browsers install chrome || echo "⚠️ Chrome install failed, will retry at runtime"
cd ..

echo "✅ Build complete!"
ls -la $PUPPETEER_CACHE_DIR/ 2>/dev/null || echo "Cache check"
