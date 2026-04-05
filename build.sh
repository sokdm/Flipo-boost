#!/bin/bash

echo "🚀 Starting Filpo Boost Render Build..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install and build server
echo "📦 Installing server dependencies..."
cd server
npm install

# Install Chrome for Puppeteer
echo "🌐 Installing Chrome for Puppeteer..."
npx puppeteer browsers install chrome

cd ..

# Install and build client
echo "📦 Installing client dependencies..."
cd client
npm install

echo "🔨 Building client..."
npm run build

cd ..

echo "✅ Build complete!"
