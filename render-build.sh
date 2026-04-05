#!/bin/bash

echo "🚀 Starting Filpo Boost Build..."

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

# Install Chrome locally in project (not in /opt/render/.cache)
echo "🌐 Installing Chrome locally..."
mkdir -p .cache/puppeteer
cd server
PUPPETEER_CACHE_DIR=../.cache/puppeteer npx puppeteer browsers install chrome || echo "⚠️ Chrome install failed"
cd ..

echo "✅ Build complete!"
ls -la .cache/puppeteer/ 2>/dev/null || echo "No local cache yet"
