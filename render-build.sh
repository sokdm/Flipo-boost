#!/bin/bash

echo "🚀 Starting Filpo Boost Build..."

# Install root deps
echo "📦 Installing root dependencies..."
npm install

# Install client deps and build
echo "📦 Installing client dependencies..."
cd client
npm install

echo "🔨 Building client..."
npm run build
cd ..

# Install server deps (without Chrome download)
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Try to install Chrome for Puppeteer (Render specific)
echo "🌐 Attempting to install Chrome..."
apt-get update -qq && apt-get install -y -qq wget gnupg2 apt-utils > /dev/null 2>&1 || true

# Try to install Chrome
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - > /dev/null 2>&1 || true
echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list > /dev/null 2>&1 || true
apt-get update -qq > /dev/null 2>&1 || true
apt-get install -y -qq google-chrome-stable > /dev/null 2>&1 || echo "⚠️ Chrome install failed, will try fallback"

echo "✅ Build complete!"
